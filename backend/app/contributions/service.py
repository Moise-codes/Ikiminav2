"""Contributions ledger: immutable, idempotent, lock-protected money records."""

from __future__ import annotations

import datetime as dt
import uuid
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import AuditService
from app.common.envelope import Page
from app.common.money import validate_contribution_amount
from app.core.errors import (
    BusinessRuleViolation,
    ConflictError,
    IdempotencyConflictError,
    NotFoundError,
    PermissionDeniedError,
    ValidationError,
)
from app.core.dependencies import Pagination
from app.integrations.sms.templates import render
from app.models.ledger import Contribution, ContributionDispute
from app.models.group import Group, Membership
from app.models.identity import User
from app.notifications.service import NotificationService


class ContributionService:
    """Business rules for recording and correcting contributions."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # recording
    # ------------------------------------------------------------------
    async def record_contribution(
        self,
        *,
        group: Group,
        actor: User,
        membership_id: uuid.UUID,
        period: str,
        amount_rwf: int,
        paid_at: dt.datetime | None,
        method: str,
        reference: str | None,
        idempotency_key: str | None,
        ip: str | None,
    ) -> Contribution:
        """Record a contribution inside a locked transaction.

        The group row is locked first so concurrent writes cannot corrupt the
        pot. The idempotency key makes retries safe.
        """
        validate_contribution_amount(amount_rwf)

        membership = await self._get_membership(group.id, membership_id)
        if membership.status != "active":
            raise PermissionDeniedError(
                "Only active members can receive contributions.",
                code="MEMBER_NOT_ACTIVE",
            )

        if idempotency_key:
            existing = await self._find_idempotency(actor.id, idempotency_key)
            if existing is not None:
                stored_body = existing.get("response_body") or {}
                contribution_id = stored_body.get("contribution_id")
                if contribution_id:
                    return await self.db.get(Contribution, contribution_id)
                # First request is still in flight.
                raise ConflictError(
                    "A request with this idempotency key is in progress.",
                    code="IDEMPOTENCY_IN_PROGRESS",
                )
            raise IdempotencyConflictError()

        # Lock the group row to serialize pot changes.
        await self.db.execute(
            select(Group).where(Group.id == group.id).with_for_update()
        )

        contribution = Contribution(
            group_id=group.id,
            membership_id=membership_id,
            period=period,
            type="payment",
            amount_rwf=amount_rwf,
            paid_at=paid_at or dt.datetime.now(dt.timezone.utc),
            method=method,
            reference=reference,
            recorded_by_user_id=actor.id,
            idempotency_key=idempotency_key,
        )
        self.db.add(contribution)
        await self.db.flush()

        if idempotency_key:
            await self._store_idempotency(
                actor.id, idempotency_key, contribution.id, 201
            )

        await AuditService(self.db).record(
            action="contribution.recorded",
            entity_type="contribution",
            entity_id=contribution.id,
            actor_user_id=actor.id,
            group_id=group.id,
            after_data={
                "membership_id": str(membership_id),
                "period": period,
                "amount_rwf": amount_rwf,
                "method": method,
            },
            ip=ip,
        )

        # Notify the member (not the treasurer — they already know).
        await self._notify_member(contribution)

        return contribution

    async def record_penalty(
        self,
        *,
        group: Group,
        actor: User,
        membership_id: uuid.UUID,
        period: str,
        amount_rwf: int,
        reason: str,
        method: str,
        idempotency_key: str | None,
        ip: str | None,
    ) -> Contribution:
        """Record a late-payment fine as a separate ``penalty`` row.

        Penalties go into the same contributions table but with
        ``type='penalty'`` so reports can separate fines from regular
        contributions cleanly.
        """
        membership = await self._get_membership(group.id, membership_id)
        if membership is None or membership.status != "active":
            raise PermissionDeniedError(
                "Only active members can be charged a penalty.",
                code="MEMBER_NOT_ACTIVE",
            )

        if idempotency_key:
            existing = await self._find_idempotency(actor.id, idempotency_key)
            if existing is not None:
                stored_body = existing.get("response_body") or {}
                contribution_id = stored_body.get("contribution_id")
                if contribution_id:
                    return await self.db.get(Contribution, contribution_id)
                raise ConflictError(
                    "A request with this idempotency key is in progress.",
                    code="IDEMPOTENCY_IN_PROGRESS",
                )

        await self.db.execute(
            select(Group).where(Group.id == group.id).with_for_update()
        )

        penalty = Contribution(
            group_id=group.id,
            membership_id=membership_id,
            period=period,
            type="penalty",
            amount_rwf=amount_rwf,
            paid_at=dt.datetime.now(dt.timezone.utc),
            method=method,
            reference=reason[:64],
            recorded_by_user_id=actor.id,
            idempotency_key=idempotency_key,
        )
        self.db.add(penalty)
        await self.db.flush()

        if idempotency_key:
            await self._store_idempotency(actor.id, idempotency_key, penalty.id, 201)

        await AuditService(self.db).record(
            action="contribution.penalty_recorded",
            entity_type="contribution",
            entity_id=penalty.id,
            actor_user_id=actor.id,
            group_id=group.id,
            after_data={
                "membership_id": str(membership_id),
                "period": period,
                "amount_rwf": amount_rwf,
                "reason": reason,
            },
            ip=ip,
        )

        # Notify the penalised member
        await self._notify_member(penalty)
        return penalty

    async def reverse_contribution(
        self,
        *,
        group: Group,
        actor: User,
        contribution_id: uuid.UUID,
        reason: str,
        idempotency_key: str | None,
        ip: str | None,
    ) -> Contribution:
        """Correct a mistake with a reversal row; never touch the original."""
        original = await self.db.get(Contribution, contribution_id)
        if original is None or original.group_id != group.id:
            raise NotFoundError("Contribution not found.")
        if original.type == "reversal":
            raise BusinessRuleViolation(
                "Cannot reverse a reversal.", code="CANNOT_REVERSE_REVERSAL"
            )
        if idempotency_key:
            existing = await self._find_idempotency(actor.id, idempotency_key)
            if existing is not None:
                stored_body = existing.get("response_body") or {}
                contribution_id = stored_body.get("contribution_id")
                if contribution_id:
                    return await self.db.get(Contribution, contribution_id)
                raise ConflictError(
                    "A request with this idempotency key is in progress.",
                    code="IDEMPOTENCY_IN_PROGRESS",
                )

        await self.db.execute(
            select(Group).where(Group.id == group.id).with_for_update()
        )

        reversal = Contribution(
            group_id=group.id,
            membership_id=original.membership_id,
            period=original.period,
            type="reversal",
            amount_rwf=-abs(original.amount_rwf),
            reverses_id=original.id,
            paid_at=dt.datetime.now(dt.timezone.utc),
            method=original.method,
            reference=reason[:64],
            recorded_by_user_id=actor.id,
            idempotency_key=idempotency_key,
        )
        self.db.add(reversal)

        if idempotency_key:
            await self._store_idempotency(actor.id, idempotency_key, reversal.id, 201)

        await AuditService(self.db).record(
            action="contribution.reversed",
            entity_type="contribution",
            entity_id=reversal.id,
            actor_user_id=actor.id,
            group_id=group.id,
            before_data={"contribution_id": str(contribution_id)},
            after_data={
                "reverses_id": str(contribution_id),
                "amount_rwf": reversal.amount_rwf,
                "reason": reason,
            },
            ip=ip,
        )
        await self.db.flush()
        return reversal

    # ------------------------------------------------------------------
    # disputes
    # ------------------------------------------------------------------
    async def raise_dispute(
        self,
        *,
        group: Group,
        membership: Membership,
        contribution_id: uuid.UUID,
        reason: str,
    ) -> ContributionDispute:
        contribution = await self.db.get(Contribution, contribution_id)
        if contribution is None or contribution.group_id != group.id:
            raise NotFoundError("Contribution not found.")
        if contribution.membership_id != membership.id:
            raise PermissionDeniedError(
                "You can only dispute your own contributions.",
                code="NOT_YOUR_CONTRIBUTION",
            )

        existing = await self.db.scalar(
            select(ContributionDispute).where(
                ContributionDispute.contribution_id == contribution_id,
                ContributionDispute.status == "open",
            )
        )
        if existing is not None:
            raise ConflictError(
                "This contribution already has an open dispute.",
                code="DISPUTE_EXISTS",
            )

        dispute = ContributionDispute(
            group_id=group.id,
            contribution_id=contribution_id,
            raised_by_membership_id=membership.id,
            reason=reason,
            status="open",
        )
        self.db.add(dispute)

        await AuditService(self.db).record(
            action="dispute.raised",
            entity_type="contribution_dispute",
            entity_id=dispute.id,
            actor_user_id=membership.user_id,
            group_id=group.id,
            after_data={"contribution_id": str(contribution_id), "reason": reason},
        )
        await self.db.flush()
        return dispute

    async def resolve_dispute(
        self,
        *,
        group: Group,
        actor: User,
        dispute_id: uuid.UUID,
        status: str,
        resolution_note: str | None,
    ) -> ContributionDispute:
        dispute = await self.db.get(ContributionDispute, dispute_id)
        if dispute is None or dispute.group_id != group.id:
            raise NotFoundError("Dispute not found.")
        if dispute.status != "open":
            raise ConflictError(
                "This dispute has already been resolved.", code="DISPUTE_CLOSED"
            )

        # Only a leader of the group may resolve.
        actor_membership = await self._get_membership(group.id, actor.id)
        if actor_membership.role not in ("president", "treasurer"):
            raise PermissionDeniedError(
                "Only a leader can resolve disputes.", code="LEADER_ONLY"
            )

        dispute.status = status
        dispute.resolved_by_membership_id = actor_membership.id
        dispute.resolution_note = resolution_note
        dispute.resolved_at = dt.datetime.now(dt.timezone.utc)

        await AuditService(self.db).record(
            action="dispute.resolved",
            entity_type="contribution_dispute",
            entity_id=dispute.id,
            actor_user_id=actor.id,
            group_id=group.id,
            after_data={"status": status, "resolution_note": resolution_note},
        )
        await self.db.flush()
        return dispute

    # ------------------------------------------------------------------
    # queries
    # ------------------------------------------------------------------
    async def list_contributions(
        self,
        *,
        group: Group,
        membership_id: uuid.UUID | None,
        period: str | None,
        pagination: Pagination,
    ) -> Page[Contribution]:
        query = select(Contribution).where(Contribution.group_id == group.id)
        if membership_id is not None:
            query = query.where(Contribution.membership_id == membership_id)
        if period is not None:
            query = query.where(Contribution.period == period)
        query = query.order_by(Contribution.paid_at.desc())

        total = await self.db.scalar(select(func.count()).select_from(query.subquery()))
        result = await self.db.execute(
            query.offset(pagination.offset).limit(pagination.limit)
        )
        items = list(result.scalars())
        return Page.build(
            items,
            total=total or 0,
            page=pagination.page,
            per_page=pagination.per_page,
        )

    async def member_summary(
        self, *, group: Group, membership_id: uuid.UUID
    ) -> dict[str, Any]:
        """Expected vs paid per period for one member."""
        paid = await self.db.scalar(
            select(func.coalesce(func.sum(Contribution.amount_rwf), 0)).where(
                Contribution.group_id == group.id,
                Contribution.membership_id == membership_id,
                Contribution.type == "payment",
            )
        )
        return {
            "membership_id": str(membership_id),
            "total_paid_rwf": int(paid or 0),
        }

    # ------------------------------------------------------------------
    # internals
    # ------------------------------------------------------------------
    async def _get_membership(self, group_id: uuid.UUID, membership_id: uuid.UUID):
        from sqlalchemy import select as _select

        return await self.db.scalar(
            _select(Membership).where(
                Membership.id == membership_id, Membership.group_id == group_id
            )
        )

    async def _find_idempotency(
        self, user_id: uuid.UUID, key: str
    ) -> dict[str, Any] | None:
        from app.models.platform import IdempotencyKey

        row = await self.db.scalar(
            select(IdempotencyKey).where(
                IdempotencyKey.user_id == user_id, IdempotencyKey.key == key
            )
        )
        if row is None:
            return None
        return {
            "status_code": row.status_code,
            "response_body": row.response_body or {},
        }

    async def _store_idempotency(
        self,
        user_id: uuid.UUID,
        key: str,
        contribution_id: uuid.UUID,
        status_code: int,
    ) -> None:
        from app.models.platform import IdempotencyKey

        self.db.add(
            IdempotencyKey(
                user_id=user_id,
                key=key,
                request_hash="",
                status_code=status_code,
                response_body={"contribution_id": str(contribution_id)},
            )
        )

    async def _notify_member(self, contribution: Contribution) -> None:
        from app.models.identity import User

        membership = await self.db.get(Membership, contribution.membership_id)
        if not membership or not membership.user_id:
            return
        user = await self.db.get(User, membership.user_id)
        if not user or not user.phone:
            return
        notifications = NotificationService(self.db)
        await notifications.notify(
            user_id=user.id,
            phone=user.phone,
            template="contribution_recorded",
            payload={
                "amount": contribution.amount_rwf,
                "group_id": str(contribution.group_id),
            },
        )

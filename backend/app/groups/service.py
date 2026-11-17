"""Groups and memberships business rules."""

from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import AuditService
from app.common.envelope import Page
from app.core.errors import (
    BusinessRuleViolation,
    ConflictError,
    NotFoundError,
    PermissionDeniedError,
    ValidationError,
)
from app.core.dependencies import Pagination
from app.integrations.sms.templates import render
from app.models.group import Group, GroupRuleVersion, Membership
from app.models.identity import User
from app.notifications.service import NotificationService

ROLE_PRIORITY = {"president": 2, "treasurer": 1, "member": 0}


class GroupService:
    """Business rules for groups and memberships."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # groups
    # ------------------------------------------------------------------
    async def create_group(
        self,
        *,
        creator: User,
        name: str,
        description: str | None,
        district: str | None,
        sector: str | None,
        default_contribution_rwf: int,
        frequency: str,
        contribution_day: int,
        loan_interest_bp: int,
        max_loan_multiple: int | None,
    ) -> Group:
        """Create a group and make the caller its president."""
        group = Group(
            name=name,
            description=description,
            district=district,
            sector=sector,
            default_contribution_rwf=default_contribution_rwf,
            frequency=frequency,
            contribution_day=contribution_day,
            loan_interest_bp=loan_interest_bp,
            max_loan_multiple=max_loan_multiple,
            status="active",
            rules_version=1,
            created_by=creator.id,
        )
        self.db.add(group)
        await self.db.flush()

        membership = Membership(
            group_id=group.id,
            user_id=creator.id,
            role="president",
            status="active",
            joined_at=dt.datetime.now(dt.timezone.utc),
            added_by_user_id=creator.id,
        )
        self.db.add(membership)

        version = GroupRuleVersion(
            group_id=group.id,
            version=1,
            default_contribution_rwf=default_contribution_rwf,
            frequency=frequency,
            contribution_day=contribution_day,
            loan_interest_bp=loan_interest_bp,
            max_loan_multiple=max_loan_multiple,
            effective_from_period=str(dt.date.today().year) + "-01",
            changed_by=creator.id,
        )
        self.db.add(version)

        await AuditService(self.db).record(
            action="group.created",
            entity_type="group",
            entity_id=group.id,
            actor_user_id=creator.id,
            group_id=group.id,
            after_data={
                "name": name,
                "frequency": frequency,
                "default_contribution_rwf": default_contribution_rwf,
            },
        )
        await self.db.flush()
        return group

    async def get_group(self, group_id: uuid.UUID) -> Group:
        group = await self.db.get(Group, group_id)
        if group is None:
            raise NotFoundError("Group not found.")
        return group

    async def list_groups_for_user(
        self, *, user: User, pagination: Pagination
    ) -> Page[Group]:
        """Groups the caller belongs to (any role)."""
        query = (
            select(Group)
            .join(Membership, Membership.group_id == Group.id)
            .where(Membership.user_id == user.id, Membership.status != "left")
            .order_by(Group.created_at.desc())
        )
        total = await self.db.scalar(
            select(func.count()).select_from(query.subquery())
        )
        result = await self.db.execute(
            query.offset(pagination.offset).limit(pagination.limit)
        )
        groups = list(result.scalars())
        return Page.build(
            groups, total=total or 0, page=pagination.page, per_page=pagination.per_page
        )

    async def update_rules(
        self,
        *,
        group: Group,
        actor: User,
        updates: dict,
        effective_from_period: str,
    ) -> Group:
        """Change group rules, snapshot the old version, apply to future periods."""
        updates = {k: v for k, v in updates.items() if v is not None}
        if not updates:
            raise ValidationError("No changes provided.")

        before = {
            "default_contribution_rwf": group.default_contribution_rwf,
            "frequency": group.frequency,
            "contribution_day": group.contribution_day,
            "loan_interest_bp": group.loan_interest_bp,
            "max_loan_multiple": group.max_loan_multiple,
        }

        new_version = group.rules_version + 1
        if "default_contribution_rwf" in updates:
            group.default_contribution_rwf = updates["default_contribution_rwf"]
        if "frequency" in updates:
            group.frequency = updates["frequency"]
        if "contribution_day" in updates:
            group.contribution_day = updates["contribution_day"]
        if "loan_interest_bp" in updates:
            group.loan_interest_bp = updates["loan_interest_bp"]
        if "max_loan_multiple" in updates:
            group.max_loan_multiple = updates["max_loan_multiple"]
        if "name" in updates:
            group.name = updates["name"]
        if "description" in updates:
            group.description = updates["description"]

        # contribution_day meaning depends on frequency:
        #   weekly → 0-6 (day-of-week), monthly/biweekly → 1-28 (day-of-month)
        freq = updates.get("frequency", group.frequency)
        day = updates.get("contribution_day", group.contribution_day)
        if freq == "weekly":
            if not (0 <= day <= 6):
                raise ValidationError(
                    "Weekly groups require contribution_day 0-6 "
                    "(0 = Monday, 6 = Sunday).",
                    code="INVALID_CONTRIBUTION_DAY",
                )
        elif not (1 <= day <= 28):
            raise ValidationError(
                "Monthly/biweekly groups require contribution_day 1-28.",
                code="INVALID_CONTRIBUTION_DAY",
            )

        group.rules_version = new_version

        version = GroupRuleVersion(
            group_id=group.id,
            version=new_version,
            default_contribution_rwf=group.default_contribution_rwf,
            frequency=group.frequency,
            contribution_day=group.contribution_day,
            loan_interest_bp=group.loan_interest_bp,
            max_loan_multiple=group.max_loan_multiple,
            effective_from_period=effective_from_period,
            changed_by=actor.id,
        )
        self.db.add(version)

        await AuditService(self.db).record(
            action="group.rules_changed",
            entity_type="group",
            entity_id=group.id,
            actor_user_id=actor.id,
            group_id=group.id,
            before_data=before,
            after_data={
                "default_contribution_rwf": group.default_contribution_rwf,
                "frequency": group.frequency,
                "loan_interest_bp": group.loan_interest_bp,
            },
        )
        await self.db.flush()
        return group

    # ------------------------------------------------------------------
    # memberships
    # ------------------------------------------------------------------
    async def add_member(
        self,
        *,
        group: Group,
        actor: User,
        phone_raw: str,
        role: str,
        suggested_contribution_rwf: int | None,
    ) -> Membership:
        """Invite a member by phone. Creates a pending invite if no account."""
        from app.common.phone import normalize_phone

        phone = normalize_phone(phone_raw)

        existing = await self.db.scalar(
            select(Membership).where(
                Membership.group_id == group.id,
                Membership.invited_phone == phone.e164,
                Membership.status.in_(("invited", "active", "suspended")),
            )
        )
        if existing is not None:
            raise ConflictError(
                "This phone number is already a member or has a pending invite.",
                code="MEMBER_ALREADY_INVITED",
            )

        user = await self.db.scalar(select(User).where(User.phone == phone.e164))

        membership = Membership(
            group_id=group.id,
            user_id=user.id if user else None,
            invited_phone=None if user else phone.e164,
            role=role,
            status="active" if user else "invited",
            suggested_contribution_rwf=suggested_contribution_rwf,
            joined_at=dt.datetime.now(dt.timezone.utc) if user else None,
            added_by_user_id=actor.id,
        )
        self.db.add(membership)
        await self.db.flush()

        await AuditService(self.db).record(
            action="membership.added",
            entity_type="membership",
            entity_id=membership.id,
            actor_user_id=actor.id,
            group_id=group.id,
            after_data={
                "role": role,
                "status": membership.status,
                "invited_phone": phone.masked,
            },
        )
        return membership

    async def list_members(
        self, *, group: Group, pagination: Pagination
    ) -> Page[Membership]:
        query = (
            select(Membership)
            .where(Membership.group_id == group.id, Membership.status != "left")
            .order_by(Membership.created_at.desc())
        )
        total = await self.db.scalar(select(func.count()).select_from(query.subquery()))
        result = await self.db.execute(
            query.offset(pagination.offset).limit(pagination.limit)
        )
        members = list(result.scalars())
        return Page.build(
            members, total=total or 0, page=pagination.page, per_page=pagination.per_page
        )

    async def update_membership(
        self,
        *,
        group: Group,
        actor: User,
        membership: Membership,
        updates: dict,
    ) -> Membership:
        """Change a member's role or suspend/reactivate them."""
        if "role" in updates and updates["role"] != membership.role:
            if updates["role"] == "president":
                if membership.role != "president":
                    # Transfer presidency: demote current president first.
                    current = await self.db.scalar(
                        select(Membership).where(
                            Membership.group_id == group.id,
                            Membership.role == "president",
                            Membership.status == "active",
                            Membership.id != membership.id,
                        )
                    )
                    if current:
                        current.role = "member"
            if updates["role"] == "treasurer":
                current_treasurer = await self.db.scalar(
                    select(Membership).where(
                        Membership.group_id == group.id,
                        Membership.role == "treasurer",
                        Membership.status == "active",
                        Membership.id != membership.id,
                    )
                )
                if current_treasurer:
                    raise ConflictError(
                        "This group already has an active treasurer.",
                        code="TREASURER_EXISTS",
                    )
            membership.role = updates["role"]

        if "status" in updates and updates["status"] != membership.status:
            if updates["status"] == "suspended" and membership.role == "president":
                raise BusinessRuleViolation(
                    "The president cannot be suspended. Transfer the presidency first.",
                    code="CANNOT_SUSPEND_PRESIDENT",
                )
            membership.status = updates["status"]
            if updates["status"] == "active":
                membership.joined_at = dt.datetime.now(dt.timezone.utc)
            if updates["status"] == "left":
                membership.left_at = dt.datetime.now(dt.timezone.utc)

        if "suggested_contribution_rwf" in updates:
            membership.suggested_contribution_rwf = updates["suggested_contribution_rwf"]

        await AuditService(self.db).record(
            action="membership.updated",
            entity_type="membership",
            entity_id=membership.id,
            actor_user_id=actor.id,
            group_id=group.id,
            before_data={"role": membership.role, "status": membership.status},
            after_data=updates,
        )
        await self.db.flush()
        return membership

    async def remove_member(
        self, *, group: Group, actor: User, membership: Membership
    ) -> None:
        """Soft-delete: mark left but keep all financial history."""
        if membership.role == "president":
            raise BusinessRuleViolation(
                "The president cannot be removed. Transfer the presidency first.",
                code="CANNOT_REMOVE_PRESIDENT",
            )
        membership.status = "left"
        membership.left_at = dt.datetime.now(dt.timezone.utc)
        await AuditService(self.db).record(
            action="membership.removed",
            entity_type="membership",
            entity_id=membership.id,
            actor_user_id=actor.id,
            group_id=group.id,
            after_data={"status": "left"},
        )
        await self.db.flush()

    # ------------------------------------------------------------------
    # notifications
    # ------------------------------------------------------------------
    async def notify_invitation(
        self, *, membership: Membership, actor: User
    ) -> None:
        """Queue an SMS telling an invitee they were added."""
        if not membership.invited_phone:
            return
        group = await self.db.get(Group, membership.group_id)
        notifications = NotificationService(self.db)
        await notifications.enqueue_sms(
            to=membership.invited_phone,
            template="group_invitation",
            payload={"group": group.name if group else "a savings group"},
        )

    # ------------------------------------------------------------------
    # pot distribution
    # ------------------------------------------------------------------
    async def distribute_pot(
        self,
        *,
        group: Group,
        actor: User,
        period: str,
        total_amount_rwf: int,
        equal_shares: bool,
        notes: str | None,
    ) -> tuple:
        """Record a cycle-end pot distribution and compute per-member shares.

        Returns a ``(PotDistribution, list[DistributionShare])`` tuple.

        Share calculation:
        - ``equal_shares=True``  → every active member gets an equal slice.
        - ``equal_shares=False`` → each member's share is proportional to
          their total contributions recorded for the group up to and
          including ``period``.  Members with zero contributions still
          receive a share equal to the minimum (1 RWF) so no one is
          silently excluded; the remaining amount is split proportionally.
        """
        from sqlalchemy import func as _func, select as _select
        from app.models.group import PotDistribution, DistributionShare
        from app.models.ledger import Contribution

        # Fetch active members
        members_result = await self.db.scalars(
            _select(Membership).where(
                Membership.group_id == group.id,
                Membership.status == "active",
            )
        )
        members = list(members_result)
        if not members:
            raise ValidationError(
                "Cannot distribute pot — the group has no active members.",
                code="NO_ACTIVE_MEMBERS",
            )

        distribution = PotDistribution(
            group_id=group.id,
            period=period,
            total_amount_rwf=total_amount_rwf,
            equal_shares=equal_shares,
            notes=notes,
            recorded_by_user_id=actor.id,
        )
        self.db.add(distribution)
        await self.db.flush()  # get distribution.id

        shares: list[DistributionShare] = []

        if equal_shares:
            base = total_amount_rwf // len(members)
            remainder = total_amount_rwf - base * len(members)
            for idx, member in enumerate(members):
                amount = base + (1 if idx < remainder else 0)
                share = DistributionShare(
                    distribution_id=distribution.id,
                    membership_id=member.id,
                    amount_rwf=max(amount, 1),
                )
                self.db.add(share)
                shares.append(share)
        else:
            # Proportional: weight by total paid contributions per member
            paid_rows = await self.db.execute(
                _select(
                    Contribution.membership_id,
                    _func.coalesce(_func.sum(Contribution.amount_rwf), 0).label("total"),
                )
                .where(
                    Contribution.group_id == group.id,
                    Contribution.type == "payment",
                )
                .group_by(Contribution.membership_id)
            )
            paid_map: dict = {str(row.membership_id): int(row.total) for row in paid_rows}
            total_paid = sum(paid_map.get(str(m.id), 0) for m in members)

            if total_paid == 0:
                # No contributions recorded — fall back to equal shares
                base = total_amount_rwf // len(members)
                remainder = total_amount_rwf - base * len(members)
                for idx, member in enumerate(members):
                    amount = base + (1 if idx < remainder else 0)
                    share = DistributionShare(
                        distribution_id=distribution.id,
                        membership_id=member.id,
                        amount_rwf=max(amount, 1),
                    )
                    self.db.add(share)
                    shares.append(share)
            else:
                allocated = 0
                for idx, member in enumerate(members):
                    contrib = paid_map.get(str(member.id), 0)
                    if idx == len(members) - 1:
                        # Last member gets the remainder to avoid rounding loss
                        amount = total_amount_rwf - allocated
                    else:
                        amount = round(total_amount_rwf * contrib / total_paid)
                    amount = max(amount, 1)
                    allocated += amount
                    share = DistributionShare(
                        distribution_id=distribution.id,
                        membership_id=member.id,
                        amount_rwf=amount,
                    )
                    self.db.add(share)
                    shares.append(share)

        await AuditService(self.db).record(
            action="group.pot_distributed",
            entity_type="pot_distribution",
            entity_id=distribution.id,
            actor_user_id=actor.id,
            group_id=group.id,
            after_data={
                "period": period,
                "total_amount_rwf": total_amount_rwf,
                "equal_shares": equal_shares,
                "num_members": len(members),
            },
        )
        await self.db.flush()
        return distribution, shares

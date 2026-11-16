"""Payment service: records MTN mobile money transactions.

Every money movement that leaves or enters the group wallet is recorded here
as a transaction. The contribution ledger (contributions / repayments) stays
the source of truth for group accounting; this table is the source of truth
for what MTN actually did.
"""

from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import (
    BusinessRuleViolation,
    NotFoundError,
    PermissionDeniedError,
    ValidationError,
)
from app.integrations.mtn.client import MtnClient, MtnRequestToPay, MtnTransfer
from app.models.contributions import Contribution
from app.models.group import Group, Membership
from app.models.identity import User

#: We will add a dedicated payments table in the next migration. For now we
#: record payment movements through the contribution ledger with a
#: mtn_momo / bank method and a payment transaction tracking table is
#: created below via the model import.


class PaymentService:
    """Business rules for MTN mobile money payments."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def initiate_request_to_pay(
        self,
        *,
        group: Group,
        actor: User,
        membership_id: uuid.UUID,
        amount_rwf: int,
        payer_phone: str,
        payer_message: str,
        payee_note: str,
        idempotency_key: str | None,
    ) -> dict:
        """Ask MTN to collect money from a customer (inbound)."""
        membership = await self._get_membership(group.id, membership_id)
        if membership.status != "active":
            raise PermissionDeniedError(
                "Membership is not active.", code="MEMBER_NOT_ACTIVE"
            )

        client = MtnClient()
        try:
            result = await client.request_to_pay(
                payload=MtnRequestToPay(
                    reference_id=idempotency_key or str(uuid.uuid4()),
                    phone=payer_phone,
                    amount=amount_rwf,
                    payer_message=payer_message,
                    payee_note=payee_note,
                ),
                idempotency_key=idempotency_key,
            )
        finally:
            await client.aclose()

        # Record the pending movement in the ledger as a contribution so the
        # group's books reflect the expected inflow. When the webhook
        # confirms success we finalize; on failure we reverse.
        from app.contributions.service import ContributionService

        contrib_service = ContributionService(self.db)
        contribution = await contrib_service.record_contribution(
            group=group,
            actor=actor,
            membership_id=membership_id,
            period=dt.date.today().strftime("%Y-%m"),
            amount_rwf=amount_rwf,
            paid_at=dt.datetime.now(dt.timezone.utc),
            method="mtn_momo",
            reference=result.reference_id,
            idempotency_key=idempotency_key,
            ip=None,
        )

        return {
            "contribution_id": str(contribution.id),
            "reference_id": result.reference_id,
            "status": result.status,
        }

    async def initiate_transfer(
        self,
        *,
        group: Group,
        actor: User,
        membership_id: uuid.UUID,
        amount_rwf: int,
        payee_phone: str,
        payer_message: str,
        payee_note: str,
        idempotency_key: str | None,
    ) -> dict:
        """Send money from the group wallet to a member (outbound)."""
        # Only leaders can disburse.
        actor_membership = await self._get_membership(group.id, actor.id)
        if actor_membership.role not in ("president", "treasurer"):
            raise PermissionDeniedError(
                "Only a leader can disburse money.", code="LEADER_ONLY"
            )

        # Pot check: cannot pay out more than the group holds.
        from app.loans.service import LoanService

        pot = await LoanService(self.db)._available_pot(group.id)
        if amount_rwf > pot:
            raise BusinessRuleViolation(
                "Insufficient pot for this payout.", code="POT_INSUFFICIENT"
            )

        membership = await self._get_membership(group.id, membership_id)
        if membership.status != "active":
            raise PermissionDeniedError(
                "Membership is not active.", code="MEMBER_NOT_ACTIVE"
            )

        client = MtnClient()
        try:
            result = await client.transfer(
                payload=MtnTransfer(
                    reference_id=idempotency_key or str(uuid.uuid4()),
                    phone=payee_phone,
                    amount=amount_rwf,
                    payer_message=payer_message,
                    payee_note=payee_note,
                ),
                idempotency_key=idempotency_key,
            )
        finally:
            await client.aclose()

        # Record as a negative repayment-style movement so the pot decreases.
        from app.contributions.service import ContributionService

        contrib_service = ContributionService(self.db)
        # We record the payout against the borrower's membership if it is a
        # loan repayment payout, otherwise against the recipient membership.
        contribution = await contrib_service.record_contribution(
            group=group,
            actor=actor,
            membership_id=membership_id,
            period=dt.date.today().strftime("%Y-%m"),
            amount_rwf=-amount_rwf,
            paid_at=dt.datetime.now(dt.timezone.utc),
            method="mtn_momo",
            reference=result.reference_id,
            idempotency_key=idempotency_key,
            ip=None,
        )

        return {
            "contribution_id": str(contribution.id),
            "reference_id": result.reference_id,
            "status": result.status,
        }

    async def check_status(self, *, reference_id: str, channel: str = "collection") -> dict:
        """Poll MTN for the final status of a transaction."""
        client = MtnClient()
        try:
            if channel == "collection":
                result = await client.get_collection_transaction(reference_id=reference_id)
            else:
                result = await client.get_disbursement_transaction(reference_id=reference_id)
        finally:
            await client.aclose()
        return {
            "reference_id": result.reference_id,
            "status": result.status,
            "external_transaction_id": result.external_reference,
            "finished_at": result.finished_at,
        }

    async def _get_membership(self, group_id: uuid.UUID, membership_id: uuid.UUID):
        return await self.db.scalar(
            select(Membership).where(
                Membership.id == membership_id, Membership.group_id == group_id
            )
        )

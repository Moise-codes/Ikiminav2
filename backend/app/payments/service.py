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
from app.integrations.airtel.client import operator_of
from app.integrations.mtn.client import MtnClient, MtnRequestToPay, MtnTransfer
from app.models.ledger import Contribution
from app.models.payment import PaymentTransaction
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

        reference_id = idempotency_key or str(uuid.uuid4())
        if operator_of(payer_phone) == "airtel":
            from app.integrations.airtel.client import AirtelClient

            airtel = AirtelClient()
            try:
                result = await airtel.request_to_pay(
                    reference_id=reference_id,
                    phone=payer_phone,
                    amount=amount_rwf,
                    payer_message=payer_message,
                    payee_note=payee_note,
                )
            finally:
                await airtel.aclose()
            status_text = result.status
        else:
            client = MtnClient()
            try:
                result = await client.request_to_pay(
                    payload=MtnRequestToPay(
                        reference_id=reference_id,
                        phone=payer_phone,
                        amount=amount_rwf,
                        payer_message=payer_message,
                        payee_note=payee_note,
                    ),
                    idempotency_key=idempotency_key,
                )
            finally:
                await client.aclose()
            status_text = result.status

        # Track the movement as a pending transaction. The provider webhook
        # (or status poll) flips it to successful — ONLY THEN does the
        # contribution ledger get a row. Unconfirmed money never counts.
        operator = operator_of(payer_phone)
        txn = PaymentTransaction(
            group_id=group.id,
            membership_id=membership_id,
            direction="collection",
            channel="airtel_money" if operator == "airtel" else "mtn_momo",
            provider=operator,
            amount_rwf=amount_rwf,
            status="pending",
            provider_ref=result.reference_id,
            provider_txn_id=getattr(result, "transaction_id", None) or getattr(result, "external_reference", None),
            counterparty_phone=payer_phone,
            idempotency_key=idempotency_key,
            created_by_user_id=actor.id,
        )
        self.db.add(txn)
        await self.db.flush()

        return {
            "transaction_id": str(txn.id),
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
        # Only leaders can disburse. Membership is keyed by user_id here,
        # unlike _get_membership which takes a membership_id.
        actor_membership = await self.db.scalar(
            select(Membership).where(
                Membership.group_id == group.id,
                Membership.user_id == actor.id,
                Membership.status == "active",
            )
        )
        if actor_membership is None or actor_membership.role not in ("president", "treasurer"):
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

        reference_id = idempotency_key or str(uuid.uuid4())
        if operator_of(payee_phone) == "airtel":
            from app.integrations.airtel.client import AirtelClient

            airtel = AirtelClient()
            try:
                result = await airtel.transfer(
                    reference_id=reference_id,
                    phone=payee_phone,
                    amount=amount_rwf,
                    payer_message=payer_message,
                    payee_note=payee_note,
                )
            finally:
                await airtel.aclose()
        else:
            client = MtnClient()
            try:
                result = await client.transfer(
                    payload=MtnTransfer(
                        reference_id=reference_id,
                        phone=payee_phone,
                        amount=amount_rwf,
                        payer_message=payer_message,
                        payee_note=payee_note,
                    ),
                    idempotency_key=idempotency_key,
                )
            finally:
                await client.aclose()

        # Track as a pending disbursement transaction — confirmed by webhook.
        operator = operator_of(payee_phone)
        txn = PaymentTransaction(
            group_id=group.id,
            membership_id=membership_id,
            direction="disbursement",
            channel="airtel_money" if operator == "airtel" else "mtn_momo",
            provider=operator,
            amount_rwf=amount_rwf,
            status="pending",
            provider_ref=result.reference_id,
            provider_txn_id=getattr(result, "transaction_id", None) or getattr(result, "external_reference", None),
            counterparty_phone=payee_phone,
            idempotency_key=idempotency_key,
            created_by_user_id=actor.id,
        )
        self.db.add(txn)
        await self.db.flush()

        from app.audit.service import AuditService

        await AuditService(self.db).record(
            action="payment.disbursement_initiated",
            entity_type="payment_transaction",
            entity_id=txn.id,
            actor_user_id=actor.id,
            group_id=group.id,
            after_data={
                "amount_rwf": amount_rwf,
                "payee_phone": payee_phone,
                "reference_id": result.reference_id,
                "provider": operator,
            },
        )

        return {
            "transaction_id": str(txn.id),
            "reference_id": result.reference_id,
            "status": result.status,
        }

    async def check_status(self, *, reference_id: str, channel: str = "collection") -> dict:
        """Poll the provider for the final status of a transaction.

        ``channel`` may be ``collection``/``disbursement`` (MTN) or
        ``airtel`` (Airtel Money Africa status endpoint).
        """
        if channel == "airtel":
            from app.integrations.airtel.client import AirtelClient

            airtel = AirtelClient()
            try:
                result = await airtel.get_transaction_status(transaction_id=reference_id)
            finally:
                await airtel.aclose()
            return {
                "reference_id": result.reference_id,
                "status": result.status,
                "external_transaction_id": result.transaction_id,
                "finished_at": None,
            }

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

    async def handle_provider_callback(
        self,
        *,
        provider: str,
        provider_ref: str,
        raw_status: str,
        provider_txn_id: str | None = None,
        reason: str | None = None,
    ) -> bool:
        """Apply a provider webhook/poll result to a pending transaction.

        Idempotent: already-completed transactions are left untouched.
        On a successful collection the contribution ledger row is created
        here — the first moment the money is confirmed to exist.
        """
        txn = await self.db.scalar(
            select(PaymentTransaction).where(
                PaymentTransaction.provider == provider,
                PaymentTransaction.provider_ref == provider_ref,
            )
        )
        if txn is None or txn.status != "pending":
            return txn is not None

        status_l = (raw_status or "").lower()
        if "success" in status_l or status_l in ("completed", "finished"):
            txn.status = "successful"
        else:
            txn.status = "failed"
            txn.failure_reason = (reason or raw_status or "provider reported failure")[:300]
        txn.completed_at = dt.datetime.now(dt.timezone.utc)
        if provider_txn_id:
            txn.provider_txn_id = provider_txn_id

        if txn.status == "successful" and txn.direction == "collection":
            group = await self.db.get(Group, txn.group_id)
            creator = await self.db.get(User, txn.created_by_user_id)
            if group is not None and creator is not None:
                from app.contributions.service import ContributionService

                today = dt.date.today()
                iso = today.isocalendar()
                period = (
                    f"{iso.year}-W{iso.week:02d}"
                    if group.frequency == "weekly"
                    else f"{today.year}-{today.month:02d}"
                )
                contrib_service = ContributionService(self.db)
                contribution = await contrib_service.record_contribution(
                    group=group,
                    actor=creator,
                    membership_id=txn.membership_id,
                    period=period,
                    amount_rwf=txn.amount_rwf,
                    paid_at=dt.datetime.now(dt.timezone.utc),
                    method=txn.channel,
                    reference=txn.provider_ref,
                    idempotency_key=f"ptxn-{txn.id}",
                    ip=None,
                )
                txn.contribution_id = contribution.id
        elif txn.status == "successful":
            from app.audit.service import AuditService

            await AuditService(self.db).record(
                action="payment.disbursement_completed",
                entity_type="payment_transaction",
                entity_id=txn.id,
                actor_user_id=txn.created_by_user_id,
                group_id=txn.group_id,
                after_data={
                    "amount_rwf": txn.amount_rwf,
                    "provider": provider,
                    "provider_txn_id": provider_txn_id,
                },
            )
        await self.db.flush()
        return True

    async def _get_membership(self, group_id: uuid.UUID, membership_id: uuid.UUID):
        return await self.db.scalar(
            select(Membership).where(
                Membership.id == membership_id, Membership.group_id == group_id
            )
        )

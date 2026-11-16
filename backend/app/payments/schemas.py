"""Payment transaction schemas."""

from __future__ import annotations

import datetime as dt
import uuid

from pydantic import BaseModel, ConfigDict, Field


class MtnRequestToPayRequest(BaseModel):
    """Ask a customer to pay into the group (MTN RequestToPay)."""

    model_config = ConfigDict(str_strip_whitespace=True)

    membership_id: uuid.UUID
    amount_rwf: int = Field(ge=100, le=100_000_000)
    payer_phone: str
    payer_message: str = Field(default="Itsinda contribution", max_length=200)
    payee_note: str = Field(default="Savings group payment", max_length=200)
    idempotency_key: str | None = Field(default=None, max_length=64)


class MtnTransferRequest(BaseModel):
    """Pay out from the group wallet to a member (MTN Transfer)."""

    model_config = ConfigDict(str_strip_whitespace=True)

    membership_id: uuid.UUID
    amount_rwf: int = Field(ge=100, le=100_000_000)
    payee_phone: str
    payer_message: str = Field(default="Itsinda payout", max_length=200)
    payee_note: str = Field(default="Savings group payout", max_length=200)
    idempotency_key: str | None = Field(default=None, max_length=64)


class PaymentTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    group_id: uuid.UUID
    membership_id: uuid.UUID
    direction: str  # inbound / outbound
    channel: str  # mtn_momo / cash / bank
    amount_rwf: int
    status: str  # pending / successful / failed / reversed
    reference_id: str | None  # MTN reference id
    external_transaction_id: str | None  # MTN financialTransactionId
    recorded_by_user_id: uuid.UUID
    created_at: dt.datetime
    completed_at: dt.datetime | None


class MtnStatusCheckResponse(BaseModel):
    reference_id: str
    status: str
    external_transaction_id: str | None
    finished_at: dt.datetime | None

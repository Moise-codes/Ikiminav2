"""Contribution ledger schemas."""

from __future__ import annotations

import datetime as dt
import uuid

from pydantic import BaseModel, ConfigDict, Field


class RecordContributionRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    membership_id: uuid.UUID
    period: str = Field(..., pattern=r"^\d{4}-(0[1-9]|1[0-2]|W[0-4][0-9])$")
    amount_rwf: int = Field(ge=100, le=100_000_000)
    paid_at: dt.datetime | None = Field(default=None)
    method: str = Field(pattern="^(cash|mtn_momo|airtel_money|bank)$")
    reference: str | None = Field(default=None, max_length=64)
    idempotency_key: str | None = Field(default=None, max_length=64)


class ReverseContributionRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    contribution_id: uuid.UUID
    reason: str = Field(min_length=3, max_length=500)
    idempotency_key: str | None = Field(default=None, max_length=64)


class ContributionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    group_id: uuid.UUID
    membership_id: uuid.UUID
    period: str
    type: str
    amount_rwf: int
    reverses_id: uuid.UUID | None
    paid_at: dt.datetime
    method: str
    reference: str | None
    recorded_by_user_id: uuid.UUID
    idempotency_key: str | None
    created_at: dt.datetime


class DisputeRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    contribution_id: uuid.UUID
    reason: str = Field(min_length=3, max_length=500)


class DisputeResolveRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    status: str = Field(pattern="^(upheld|rejected)$")
    resolution_note: str | None = Field(default=None, max_length=500)


class ContributionDisputeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    group_id: uuid.UUID
    contribution_id: uuid.UUID
    raised_by_membership_id: uuid.UUID
    reason: str
    status: str
    resolved_by_membership_id: uuid.UUID | None
    resolution_note: str | None
    created_at: dt.datetime

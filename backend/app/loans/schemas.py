"""Loan and repayment request/response schemas."""

from __future__ import annotations

import datetime as dt
import uuid

from pydantic import BaseModel, ConfigDict, Field


class RequestLoanRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    principal_rwf: int = Field(ge=1, le=100_000_000)
    term_months: int = Field(ge=1, le=36)
    purpose: str | None = Field(default=None, max_length=300)


class ApproveLoanRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    decision_reason: str | None = Field(default=None, max_length=300)


class RejectLoanRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    decision_reason: str = Field(min_length=3, max_length=300)


class RecordRepaymentRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    amount_rwf: int = Field(ge=1, le=100_000_000)
    paid_at: dt.datetime | None = Field(default=None)
    principal_part_rwf: int = Field(ge=0)
    interest_part_rwf: int = Field(ge=0)
    method: str = Field(pattern="^(cash|mtn_momo|airtel_money|bank)$")
    reference: str | None = Field(default=None, max_length=64)
    idempotency_key: str | None = Field(default=None, max_length=64)


class LoanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    group_id: uuid.UUID
    membership_id: uuid.UUID
    principal_rwf: int
    interest_bp: int
    term_months: int
    purpose: str | None
    status: str
    total_due_rwf: int | None
    outstanding_rwf: int | None
    decided_by_membership_id: uuid.UUID | None
    decided_at: dt.datetime | None
    decision_reason: str | None
    disbursed_at: dt.datetime | None
    requested_at: dt.datetime


class LoanScheduleItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    loan_id: uuid.UUID
    installment_no: int
    due_date: dt.date
    principal_rwf: int
    interest_rwf: int
    total_rwf: int
    paid_rwf: int


class RepaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    loan_id: uuid.UUID
    group_id: uuid.UUID
    membership_id: uuid.UUID
    type: str
    amount_rwf: int
    principal_part_rwf: int
    interest_part_rwf: int
    reverses_id: uuid.UUID | None
    paid_at: dt.datetime
    method: str
    reference: str | None
    recorded_by_user_id: uuid.UUID
    created_at: dt.datetime

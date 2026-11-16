"""Group and membership request/response schemas."""

from __future__ import annotations

import datetime as dt
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.common.phone import InvalidPhoneNumber, normalize_phone


def _normalize_phone(value: str) -> str:
    try:
        return normalize_phone(value).e164
    except InvalidPhoneNumber as exc:
        raise ValueError(f"invalid phone: {exc.reason}") from exc


class CreateGroupRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=3, max_length=80)
    description: str | None = Field(default=None, max_length=500)
    district: str | None = Field(default=None, max_length=50)
    sector: str | None = Field(default=None, max_length=50)
    default_contribution_rwf: int = Field(ge=100, le=100_000_000)
    frequency: str = Field(pattern="^(weekly|biweekly|monthly)$")
    contribution_day: int = Field(ge=1, le=28)
    loan_interest_bp: int = Field(ge=0, le=5000, default=0)
    max_loan_multiple: int | None = Field(default=None, ge=1)

    @field_validator("name")
    @classmethod
    def _validate_name(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("group name is required")
        return cleaned


class GroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    district: str | None
    sector: str | None
    default_contribution_rwf: int
    frequency: str
    contribution_day: int
    loan_interest_bp: int
    max_loan_multiple: int | None
    status: str
    rules_version: int
    created_by: uuid.UUID
    created_at: dt.datetime


class AddMemberRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    phone: str
    role: str = Field(default="member", pattern="^(president|treasurer|member)$")
    suggested_contribution_rwf: int | None = Field(default=None, ge=100)

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str) -> str:
        return _normalize_phone(value)


class UpdateMemberRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    role: str | None = Field(default=None, pattern="^(president|treasurer|member)$")
    status: str | None = Field(default=None, pattern="^(active|suspended)$")
    suggested_contribution_rwf: int | None = Field(default=None, ge=100)


class MembershipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    group_id: uuid.UUID
    user_id: uuid.UUID | None
    invited_phone: str | None
    role: str
    status: str
    suggested_contribution_rwf: int | None
    joined_at: dt.datetime | None
    left_at: dt.datetime | None
    added_by_user_id: uuid.UUID
    created_at: dt.datetime


class UpdateGroupRulesRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=3, max_length=80)
    description: str | None = Field(default=None, max_length=500)
    default_contribution_rwf: int | None = Field(default=None, ge=100, le=100_000_000)
    frequency: str | None = Field(default=None, pattern="^(weekly|biweekly|monthly)$")
    contribution_day: int | None = Field(default=None, ge=1, le=28)
    loan_interest_bp: int | None = Field(default=None, ge=0, le=5000)
    max_loan_multiple: int | None = Field(default=None, ge=1)
    effective_from_period: str = Field(..., pattern=r"^\d{4}-(0[1-9]|1[0-2]|W[0-4][0-9])$")

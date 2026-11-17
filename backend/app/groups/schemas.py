"""Group and membership request/response schemas.

Design decisions
----------------
* ``loan_interest_pct`` is the user-facing field (e.g. ``5.0`` = 5 %).
  Internally the DB stores basis points (500). Conversion happens here so
  nothing else in the codebase needs to know about the duality.

* ``contribution_day`` meaning depends on frequency:
    - monthly / biweekly : day-of-month 1–28
    - weekly             : day-of-week  0–6  (0 = Monday … 6 = Sunday)
  A cross-field validator enforces this. The DB column keeps the integer
  value; the router and service never need to interpret it.
"""

from __future__ import annotations

import datetime as dt
import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def _normalize_phone(value: str) -> str:
    from app.common.phone import InvalidPhoneNumber, normalize_phone
    try:
        return normalize_phone(value).e164
    except InvalidPhoneNumber as exc:
        raise ValueError(f"invalid phone: {exc.reason}") from exc


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _pct_to_bp(pct: float) -> int:
    """Convert a percentage like 5.0 to basis points 500."""
    return round(pct * 100)


def _bp_to_pct(bp: int) -> float:
    """Convert basis points 500 to percentage 5.0."""
    return bp / 100


# ---------------------------------------------------------------------------
# group create / update
# ---------------------------------------------------------------------------

class CreateGroupRequest(BaseModel):
    """Create a new savings group.

    ``loan_interest_pct`` is expressed as a plain percentage (e.g. ``5.0``
    for 5 % monthly interest). Max 50 % (5000 bp).

    ``contribution_day`` interpretation:
      - monthly / biweekly : 1–28  (day of the month contributions are due)
      - weekly             : 0–6   (0 = Monday, 6 = Sunday)
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=3, max_length=80)
    description: str | None = Field(default=None, max_length=500)
    district: str | None = Field(default=None, max_length=50)
    sector: str | None = Field(default=None, max_length=50)
    default_contribution_rwf: int = Field(ge=100, le=100_000_000)
    frequency: str = Field(pattern="^(weekly|biweekly|monthly)$")
    contribution_day: int = Field(ge=0, le=28)
    # User-facing percentage, e.g. 5.0 for 5 %
    loan_interest_pct: float = Field(ge=0.0, le=50.0, default=0.0)
    max_loan_multiple: int | None = Field(default=None, ge=1, le=20)

    @field_validator("name")
    @classmethod
    def _validate_name(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("group name is required")
        return cleaned

    @model_validator(mode="after")
    def _validate_contribution_day(self) -> "CreateGroupRequest":
        if self.frequency == "weekly":
            if not (0 <= self.contribution_day <= 6):
                raise ValueError(
                    "For weekly groups, contribution_day must be 0–6 "
                    "(0 = Monday, 6 = Sunday)."
                )
        else:
            if not (1 <= self.contribution_day <= 28):
                raise ValueError(
                    "For monthly/biweekly groups, contribution_day must be "
                    "1–28 (day of the month)."
                )
        return self

    @property
    def loan_interest_bp(self) -> int:
        """Basis-points value stored in the DB."""
        return _pct_to_bp(self.loan_interest_pct)


class UpdateGroupRulesRequest(BaseModel):
    """Update the rules of an existing group (president only).

    All fields are optional — only the ones provided are changed.
    ``effective_from_period`` is required so the history ledger can record
    from which period the new rules apply (e.g. ``"2025-12"``).
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=3, max_length=80)
    description: str | None = Field(default=None, max_length=500)
    default_contribution_rwf: int | None = Field(default=None, ge=100, le=100_000_000)
    frequency: str | None = Field(default=None, pattern="^(weekly|biweekly|monthly)$")
    contribution_day: int | None = Field(default=None, ge=0, le=28)
    loan_interest_pct: float | None = Field(default=None, ge=0.0, le=50.0)
    max_loan_multiple: int | None = Field(default=None, ge=1, le=20)
    effective_from_period: str = Field(..., pattern=r"^\d{4}-(0[1-9]|1[0-2]|W[0-4][0-9])$")

    @property
    def loan_interest_bp(self) -> int | None:
        if self.loan_interest_pct is None:
            return None
        return _pct_to_bp(self.loan_interest_pct)


# ---------------------------------------------------------------------------
# group responses
# ---------------------------------------------------------------------------

class GroupResponse(BaseModel):
    """Full group detail returned to the client.

    ``loan_interest_pct`` is computed from the stored basis-point value so
    the frontend never has to deal with basis points.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    district: str | None
    sector: str | None
    default_contribution_rwf: int
    frequency: str
    # day-of-month (1-28) for monthly/biweekly, day-of-week (0-6) for weekly
    contribution_day: int
    # DB value kept for internal use
    loan_interest_bp: int
    # Human-readable percentage, e.g. 5.0 for "5 % monthly interest"
    # Computed from loan_interest_bp — always set by model_validate override.
    loan_interest_pct: float = 0.0
    max_loan_multiple: int | None
    status: str
    rules_version: int
    created_by: uuid.UUID
    created_at: dt.datetime
    updated_at: dt.datetime

    @classmethod
    def model_validate(cls, obj: Any, **kwargs: Any) -> "GroupResponse":  # type: ignore[override]
        instance = super().model_validate(obj, **kwargs)
        # Compute percentage from stored bp whenever we build a response
        object.__setattr__(instance, "loan_interest_pct", _bp_to_pct(instance.loan_interest_bp))
        return instance


# ---------------------------------------------------------------------------
# membership create / update / response
# ---------------------------------------------------------------------------

class AddMemberRequest(BaseModel):
    """Invite a member to a group by their Rwandan phone number."""

    model_config = ConfigDict(str_strip_whitespace=True)

    phone: str
    role: str = Field(default="member", pattern="^(president|treasurer|member)$")
    suggested_contribution_rwf: int | None = Field(default=None, ge=100)

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str) -> str:
        return _normalize_phone(value)


class UpdateMemberRequest(BaseModel):
    """Change a member's role or status (president only)."""

    model_config = ConfigDict(str_strip_whitespace=True)

    role: str | None = Field(default=None, pattern="^(president|treasurer|member)$")
    status: str | None = Field(default=None, pattern="^(active|suspended)$")
    suggested_contribution_rwf: int | None = Field(default=None, ge=100)


class MembershipResponse(BaseModel):
    """A member's current standing in a group."""

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
    updated_at: dt.datetime


# ---------------------------------------------------------------------------
# pot distribution
# ---------------------------------------------------------------------------

class DistributePotRequest(BaseModel):
    """Trigger a year-end (or cycle-end) distribution of the group pot.

    The president records the total amount being distributed and the period
    it covers. Each active member's share is calculated proportionally to
    their total contributions unless ``equal_shares`` is True.

    ``period`` must match the last contribution period of the cycle,
    e.g. ``"2025-12"`` for a December year-end.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    period: str = Field(..., pattern=r"^\d{4}-(0[1-9]|1[0-2]|W[0-4][0-9])$")
    total_amount_rwf: int = Field(ge=100, le=1_000_000_000)
    # If True, every active member gets an equal share regardless of contributions
    equal_shares: bool = False
    notes: str | None = Field(default=None, max_length=500)


class DistributionShareResponse(BaseModel):
    """One member's share in a pot distribution."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    distribution_id: uuid.UUID
    membership_id: uuid.UUID
    amount_rwf: int
    created_at: dt.datetime


class PotDistributionResponse(BaseModel):
    """Full distribution record including per-member shares."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    group_id: uuid.UUID
    period: str
    total_amount_rwf: int
    equal_shares: bool
    notes: str | None
    recorded_by_user_id: uuid.UUID
    created_at: dt.datetime
    shares: list[DistributionShareResponse] = Field(default_factory=list)

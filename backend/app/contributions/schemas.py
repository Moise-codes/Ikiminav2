"""Contribution ledger schemas.

Contribution types
------------------
* ``payment``  — a regular contribution from a member (positive RWF).
* ``penalty``  — a late fine charged to a member (positive RWF, separate
                 from their contribution so it is tracked distinctly).
* ``reversal`` — corrects a previous payment or penalty (negative RWF,
                 must reference the original row via ``reverses_id``).

Period format
-------------
* Monthly / biweekly : ``YYYY-MM``  e.g. ``"2025-11"``
* Weekly             : ``YYYY-WNN`` e.g. ``"2025-W44"``

The validator produces a clear error message if the format is wrong, so
the frontend can show it directly without mapping error codes.
"""

from __future__ import annotations

import datetime as dt
import re
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator

# ---------------------------------------------------------------------------
# period helper
# ---------------------------------------------------------------------------

_PERIOD_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2]|W[0-4][0-9])$")


def _validate_period(value: str) -> str:
    """Validate and return a contribution period string.

    Accepts ``YYYY-MM`` (e.g. ``2025-11``) or ``YYYY-WNN`` (e.g. ``2025-W44``).
    Returns a clear message so the frontend can display it directly.
    """
    if not _PERIOD_RE.match(value):
        raise ValueError(
            "Period must be a month like '2025-11' or a week like '2025-W44'."
        )
    return value


# ---------------------------------------------------------------------------
# contribution recording
# ---------------------------------------------------------------------------

class RecordContributionRequest(BaseModel):
    """Record a regular contribution payment (treasurer / president only)."""

    model_config = ConfigDict(str_strip_whitespace=True)

    membership_id: uuid.UUID
    period: str
    amount_rwf: int = Field(ge=100, le=100_000_000)
    paid_at: dt.datetime | None = Field(default=None)
    method: str = Field(pattern="^(cash|mtn_momo|airtel_money|bank)$")
    reference: str | None = Field(default=None, max_length=64)
    idempotency_key: str | None = Field(default=None, max_length=64)

    @field_validator("period")
    @classmethod
    def _validate_period(cls, value: str) -> str:
        return _validate_period(value)


class RecordPenaltyRequest(BaseModel):
    """Record a late-payment fine against a member (treasurer / president only).

    Penalties are stored as separate ``type="penalty"`` rows so they appear
    distinctly in reports and member statements rather than inflating the
    regular contribution total.

    ``period`` is the period the member was late for, not the current period.
    ``reason`` is shown to the member (e.g. "Late for November 2025 — 10 %").
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    membership_id: uuid.UUID
    period: str
    amount_rwf: int = Field(ge=100, le=10_000_000)
    reason: str = Field(min_length=3, max_length=300)
    method: str = Field(pattern="^(cash|mtn_momo|airtel_money|bank)$", default="cash")
    idempotency_key: str | None = Field(default=None, max_length=64)

    @field_validator("period")
    @classmethod
    def _validate_period(cls, value: str) -> str:
        return _validate_period(value)


class ReverseContributionRequest(BaseModel):
    """Correct a contribution or penalty with a reversal (treasurer / president only).

    The original row is never modified. A new row with a negative amount
    is inserted, referencing the original via ``reverses_id``. Full audit
    trail is preserved.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    contribution_id: uuid.UUID
    reason: str = Field(min_length=3, max_length=500)
    idempotency_key: str | None = Field(default=None, max_length=64)


# ---------------------------------------------------------------------------
# contribution response
# ---------------------------------------------------------------------------

class ContributionResponse(BaseModel):
    """A single ledger row returned to the client.

    ``type`` is one of ``"payment"``, ``"penalty"``, or ``"reversal"``.
    The frontend should display each differently:
      * payment  → green, adds to member total
      * penalty  → amber, adds to penalty total (not contribution total)
      * reversal → red, correction row
    """

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


# ---------------------------------------------------------------------------
# disputes
# ---------------------------------------------------------------------------

class DisputeRequest(BaseModel):
    """Raise a dispute on a contribution (any active member can dispute their own)."""

    model_config = ConfigDict(str_strip_whitespace=True)

    contribution_id: uuid.UUID
    reason: str = Field(min_length=3, max_length=500)


class DisputeResolveRequest(BaseModel):
    """Resolve an open dispute (president / treasurer only)."""

    model_config = ConfigDict(str_strip_whitespace=True)

    status: str = Field(pattern="^(upheld|rejected)$")
    resolution_note: str | None = Field(default=None, max_length=500)


class ContributionDisputeResponse(BaseModel):
    """Full dispute record returned to the client."""

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
    resolved_at: dt.datetime | None

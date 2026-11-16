"""Report schemas."""

from __future__ import annotations

import datetime as dt
import uuid

from pydantic import BaseModel, ConfigDict, Field


class GroupSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    group_id: uuid.UUID
    total_contributed_rwf: int
    total_loaned_rwf: int
    total_repaid_rwf: int
    interest_earned_rwf: int
    available_pot_rwf: int


class MemberStatementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    membership_id: uuid.UUID
    total_contributed_rwf: int
    total_borrowed_rwf: int
    total_repaid_rwf: int
    outstanding_rwf: int
    periods: list[dict] = Field(default_factory=list)


class LateMembersResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    group_id: uuid.UUID
    period: str
    late_members: list[dict] = Field(default_factory=list)

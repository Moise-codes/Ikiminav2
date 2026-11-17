"""Report response schemas.

Updated to include:
- ``total_penalties_rwf`` in both GroupSummaryResponse and MemberStatementResponse
- ``interest_earned_rwf`` properly surfaced in GroupSummaryResponse
- ``late_count`` and ``expected_rwf`` per member in LateMembersResponse
"""

from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field


class GroupSummaryResponse(BaseModel):
    """Financial snapshot for a group.

    Displayed on the group dashboard. All amounts are integers in RWF.
    """

    model_config = ConfigDict(from_attributes=True)

    group_id: uuid.UUID
    # Regular contributions (type="payment")
    total_contributed_rwf: int
    # Late fines collected (type="penalty")
    total_penalties_rwf: int
    # Principal of loans currently outstanding
    total_loaned_rwf: int
    # Total repayments made
    total_repaid_rwf: int
    # Interest component of all repayments
    interest_earned_rwf: int
    # What is in the pot right now (contributions + penalties − active loans)
    available_pot_rwf: int


class MemberStatementResponse(BaseModel):
    """Detailed activity summary for one member.

    ``periods`` is reserved for a future per-period breakdown and is
    currently returned as an empty list.
    """

    model_config = ConfigDict(from_attributes=True)

    membership_id: uuid.UUID
    # Sum of regular contributions
    total_contributed_rwf: int
    # Sum of penalties charged
    total_penalties_rwf: int
    # Sum of loan principals received
    total_borrowed_rwf: int
    # Sum of repayments made
    total_repaid_rwf: int
    # Outstanding loan balance
    outstanding_rwf: int
    # Per-period detail (populated in a future version)
    periods: list[dict] = Field(default_factory=list)


class LateMemberItem(BaseModel):
    """One late member entry."""

    membership_id: uuid.UUID
    user_id: uuid.UUID | None
    role: str
    # How much this member is expected to pay for the period
    expected_rwf: int


class LateMembersResponse(BaseModel):
    """Members who have not paid for a given period."""

    model_config = ConfigDict(from_attributes=True)

    group_id: uuid.UUID
    period: str
    # Quick count so the frontend can show "3 members late" without counting
    late_count: int
    late_members: list[dict] = Field(default_factory=list)

"""Loan routes."""

from __future__ import annotations

import datetime as dt
import uuid

from fastapi import APIRouter, Depends, Path, Request, status

from app.auth.router import _client_ip
from app.common.envelope import Page
from app.core.dependencies import CurrentUser, DbSession, PageParams, get_membership
from app.core.errors import NotFoundError
from app.core.rate_limit import rate_limit
from app.loans.schemas import (
    ApproveLoanRequest,
    LoanResponse,
    LoanScheduleItemResponse,
    RejectLoanRequest,
    RecordRepaymentRequest,
    RepaymentResponse,
    RequestLoanRequest,
)
from app.loans.service import LoanService
from app.models.group import Group, Membership
from app.models.loan import Loan, LoanScheduleItem
from app.models.ledger import Repayment

router = APIRouter(prefix="/groups/{group_id}/loans", tags=["loans"])


def _loan_response(loan: Loan) -> LoanResponse:
    return LoanResponse.model_validate(loan)


def _repayment_response(item: Repayment) -> RepaymentResponse:
    return RepaymentResponse.model_validate(item)


def _schedule_response(item: LoanScheduleItem) -> LoanScheduleItemResponse:
    return LoanScheduleItemResponse.model_validate(item)


@router.post(
    "", response_model=LoanResponse, status_code=status.HTTP_201_CREATED
)
@rate_limit("loans.request", limit=10, window_seconds=3600)
async def request_loan(
    payload: RequestLoanRequest,
    request: Request,
    group_id: uuid.UUID = Path(...),
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
) -> LoanResponse:
    """Request a loan. A leader approves or rejects it separately."""
    service = LoanService(db)
    membership = await get_membership(
        db=db, group_id=group_id, user_id=user.id, allow_invited=False
    )
    group = await db.get(Group, group_id)
    if group is None:
        raise NotFoundError("Group not found.")
    loan = await service.request_loan(
        group=group,
        borrower_membership=membership,
        principal_rwf=payload.principal_rwf,
        term_months=payload.term_months,
        purpose=payload.purpose,
    )
    await db.commit()
    return _loan_response(loan)


@router.post("/{loan_id}/approve", response_model=LoanResponse)
async def approve_loan(
    payload: ApproveLoanRequest,
    group_id: uuid.UUID = Path(...),
    loan_id: uuid.UUID = Path(...),
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
) -> LoanResponse:
    """Approve a loan. President or treasurer, not the borrower."""
    service = LoanService(db)
    decider = await get_membership(
        db=db, group_id=group_id, user_id=user.id,
        required_roles=("president", "treasurer"),
    )
    loan = await db.get(Loan, loan_id)
    if loan is None or loan.group_id != group_id:
        raise NotFoundError("Loan not found.")
    group = await db.get(Group, group_id)
    updated = await service.decide_loan(
        group=group,
        decider_membership=decider,
        loan=loan,
        decision="approved",
        reason=payload.decision_reason,
    )
    await db.commit()
    return _loan_response(updated)


@router.post("/{loan_id}/reject", response_model=LoanResponse)
async def reject_loan(
    payload: RejectLoanRequest,
    group_id: uuid.UUID = Path(...),
    loan_id: uuid.UUID = Path(...),
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
) -> LoanResponse:
    """Reject a loan. President or treasurer, not the borrower."""
    service = LoanService(db)
    decider = await get_membership(
        db=db, group_id=group_id, user_id=user.id,
        required_roles=("president", "treasurer"),
    )
    loan = await db.get(Loan, loan_id)
    if loan is None or loan.group_id != group_id:
        raise NotFoundError("Loan not found.")
    group = await db.get(Group, group_id)
    updated = await service.decide_loan(
        group=group,
        decider_membership=decider,
        loan=loan,
        decision="rejected",
        reason=payload.decision_reason,
    )
    await db.commit()
    return _loan_response(updated)


@router.get("", response_model=Page[LoanResponse])
async def list_loans(
    group_id: uuid.UUID = Path(...),
    status: str | None = None,
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
    pagination: PageParams = Depends(),
) -> Page[LoanResponse]:
    """List loans for a group."""
    service = LoanService(db)
    await get_membership(db=db, group_id=group_id, user_id=user.id)
    group = await db.get(Group, group_id)
    if group is None:
        raise NotFoundError("Group not found.")
    page = await service.list_loans(
        group=group,
        membership_id=None,
        status=status,
        pagination=pagination,
    )
    return Page[LoanResponse].build(
        items=[_loan_response(l) for l in page.items],
        total=page.pagination.total,
        page=page.pagination.page,
        per_page=page.pagination.per_page,
    )


@router.get("/{loan_id}/schedule", response_model=list[LoanScheduleItemResponse])
async def loan_schedule(
    group_id: uuid.UUID = Path(...),
    loan_id: uuid.UUID = Path(...),
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
) -> list[LoanScheduleItemResponse]:
    """Repayment schedule for a loan."""
    service = LoanService(db)
    await get_membership(db=db, group_id=group_id, user_id=user.id)
    loan = await db.get(Loan, loan_id)
    if loan is None or loan.group_id != group_id:
        raise NotFoundError("Loan not found.")
    schedule = await service.schedule_for_loan(loan=loan)
    return [_schedule_response(item) for item in schedule]


@router.post(
    "/{loan_id}/repayments",
    response_model=RepaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
@rate_limit("loans.repay", limit=60, window_seconds=3600)
async def record_repayment(
    payload: RecordRepaymentRequest,
    request: Request,
    group_id: uuid.UUID = Path(...),
    loan_id: uuid.UUID = Path(...),
    user: CurrentUser = Depends(),
    db: DbSession = Depends(),
) -> RepaymentResponse:
    """Record a repayment (treasurer records it)."""
    service = LoanService(db)
    treasurer = await get_membership(
        db=db, group_id=group_id, user_id=user.id,
        required_roles=("president", "treasurer"),
    )
    loan = await db.get(Loan, loan_id)
    if loan is None or loan.group_id != group_id:
        raise NotFoundError("Loan not found.")
    group = await db.get(Group, group_id)
    repayment = await service.record_repayment(
        group=group,
        actor=user,
        loan_id=loan_id,
        amount_rwf=payload.amount_rwf,
        paid_at=payload.paid_at,
        principal_part_rwf=payload.principal_part_rwf,
        interest_part_rwf=payload.interest_part_rwf,
        method=payload.method,
        reference=payload.reference,
        idempotency_key=payload.idempotency_key,
        ip=_client_ip(request),
    )
    await db.commit()
    return _repayment_response(repayment)

"""Unit tests for whole-franc money handling."""

from app.common.money import (
    simple_interest_rwf,
    build_schedule,
    monthly_installment_rwf,
    validate_contribution_amount,
    InvalidAmount,
)


def test_simple_interest():
    assert simple_interest_rwf(10000, 1000, 3) == 3000  # 10% per month x 3
    assert simple_interest_rwf(1000, 0, 12) == 0


def test_schedule_sums_exactly():
    principal = 10000
    interest_bp = 1000  # 10%/mo
    months = 3
    schedule = build_schedule(principal, interest_bp, months)
    assert sum(p for p, _, _ in schedule) == principal
    assert sum(i for _, i, _ in schedule) == simple_interest_rwf(principal, interest_bp, months)
    assert sum(t for _, _, t in schedule) == principal + simple_interest_rwf(principal, interest_bp, months)


def test_contribution_validation():
    assert validate_contribution_amount(100) == 100
    assert validate_contribution_amount(100_000_000) == 100_000_000
    with pytest.raises(InvalidAmount):
        validate_contribution_amount(99)
    with pytest.raises(InvalidAmount):
        validate_contribution_amount(0)

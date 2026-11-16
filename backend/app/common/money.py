"""Money helpers.

All amounts in Ikimina are whole Rwandan francs held as integers. There is
no float in the money path anywhere: floats are rejected at the boundary and
every arithmetic operation goes through these helpers so rounding happens in
exactly one place.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Final

#: Smallest contribution that can be recorded.
MIN_CONTRIBUTION_RWF: Final = 100

#: Largest single contribution that can be recorded.
MAX_CONTRIBUTION_RWF: Final = 100_000_000

#: Interest is expressed in basis points per month.
MAX_INTEREST_BP: Final = 5_000

#: Longest loan term in months.
MAX_TERM_MONTHS: Final = 36


class InvalidAmount(ValueError):
    """Raised when an amount is not a valid whole-franc value."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def validate_contribution_amount(amount: int) -> int:
    """Check a contribution is a positive whole-franc value in range."""
    if isinstance(amount, bool) or not isinstance(amount, int):
        raise InvalidAmount("not_integer")
    if amount <= 0:
        raise InvalidAmount("not_positive")
    if amount < MIN_CONTRIBUTION_RWF:
        raise InvalidAmount("below_minimum")
    if amount > MAX_CONTRIBUTION_RWF:
        raise InvalidAmount("above_maximum")
    return amount


def round_rwf(amount: Decimal | float | int) -> int:
    """Round to whole francs, half away from zero.

    Bankers rounding (``ROUND_HALF_EVEN``) looks clever but produces results
    that surprise people; half-up is what an accountant expects.
    """
    return int(Decimal(str(amount)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def simple_interest_rwf(principal_rwf: int, interest_bp: int, months: int) -> int:
    """Simple monthly interest on the original principal.

    Interest accrues per month on the original principal, which is the model
    savings groups in Rwanda use in practice. Total interest is rounded once,
    at the end, rather than per month.
    """
    if principal_rwf <= 0:
        raise InvalidAmount("not_positive")
    if not 0 <= interest_bp <= MAX_INTEREST_BP:
        raise InvalidAmount("interest_out_of_range")
    if not 1 <= months <= MAX_TERM_MONTHS:
        raise InvalidAmount("term_out_of_range")

    total = Decimal(principal_rwf) * Decimal(interest_bp) * Decimal(months) / Decimal(10_000)
    return round_rwf(total)


def monthly_installment_rwf(principal_rwf: int, interest_bp: int, months: int) -> int:
    """Principal plus total interest, split into equal monthly instalments."""
    interest = simple_interest_rwf(principal_rwf, interest_bp, months)
    total = principal_rwf + interest
    return round_rwf(Decimal(total) / Decimal(months))


def build_schedule(
    principal_rwf: int, interest_bp: int, months: int
) -> list[tuple[int, int, int]]:
    """Return ``(principal, interest, total)`` per instalment.

    The final instalment absorbs the rounding remainder so the parts always
    sum to exactly principal plus interest. Rounding drift of a few francs
    across a repayment schedule is the classic source of "the book doesn't
    add up" disputes.
    """
    interest_total = simple_interest_rwf(principal_rwf, interest_bp, months)
    total = principal_rwf + interest_total

    # Every instalment is the same total except the last, which absorbs the
    # rounding remainder so the parts sum to exactly principal + interest.
    instalment_base = total // months
    instalment_remainder = total - instalment_base * months

    # Interest accrues evenly; the final instalment takes the interest
    # remainder and whatever principal is left.
    interest_base = interest_total // months
    interest_remainder = interest_total - interest_base * months

    schedule: list[tuple[int, int, int]] = []
    principal_allocated = 0
    for index in range(months):
        is_last = index == months - 1
        instalment_total = (
            total - instalment_base * (months - 1) if is_last else instalment_base
        )
        interest_part = interest_base + (interest_remainder if is_last else 0)
        principal_part = instalment_total - interest_part
        principal_allocated += principal_part
        schedule.append((principal_part, interest_part, instalment_total))
    return schedule

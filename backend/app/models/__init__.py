"""ORM model registry.

Importing this module registers every table with the declarative metadata,
which Alembic autogenerate and the test fixtures both rely on.
"""

from app.models.base import Base, TimestampMixin, uuid7
from app.models.group import (
    FREQUENCIES,
    GROUP_STATUSES,
    ROLES,
    DistributionShare,
    Group,
    GroupRuleVersion,
    Membership,
    PotDistribution,
)
from app.models.identity import (
    OTP_PURPOSES,
    USER_STATUSES,
    DeviceToken,
    EmailVerificationToken,
    OtpChallenge,
    RefreshToken,
    User,
)
from app.models.ledger import (
    DISPUTE_STATUSES,
    LEDGER_TYPES,
    PAYMENT_METHODS,
    Contribution,
    ContributionDispute,
    Repayment,
)
from app.models.loan import LOAN_STATUSES, Loan, LoanScheduleItem
from app.models.platform import AuditLog, IdempotencyKey, OutboxMessage

__all__ = [
    "Base",
    "TimestampMixin",
    "uuid7",
    "User",
    "DeviceToken",
    "OtpChallenge",
    "EmailVerificationToken",
    "RefreshToken",
    "Group",
    "GroupRuleVersion",
    "Membership",
    "PotDistribution",
    "DistributionShare",
    "Contribution",
    "ContributionDispute",
    "Repayment",
    "Loan",
    "LoanScheduleItem",
    "AuditLog",
    "IdempotencyKey",
    "OutboxMessage",
    "ROLES",
    "FREQUENCIES",
    "GROUP_STATUSES",
    "USER_STATUSES",
    "OTP_PURPOSES",
    "LEDGER_TYPES",
    "PAYMENT_METHODS",
    "DISPUTE_STATUSES",
    "LOAN_STATUSES",
]

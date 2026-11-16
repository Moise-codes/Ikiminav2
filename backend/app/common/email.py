"""Email normalization and validation.

Email is optional and secondary: it can receive statements and receipts, but
it never substitutes for the phone number as an identity key, and it must be
verified before it is used for account recovery.
"""

from __future__ import annotations

import re
from typing import Final

#: Deliberately permissive. RFC 5322 allows far more than any real address
#: and no mail server will accept the exotic forms; the goal is to catch typos
#: without rejecting valid addresses.
EMAIL_PATTERN: Final = re.compile(
    r"^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+"
    r"(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*"
    r"@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
    r"(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$"
)

MAX_EMAIL_LENGTH: Final = 254


class InvalidEmail(ValueError):
    """Raised when an email address is malformed."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def normalize_email(raw: str | None) -> str:
    """Lowercase and validate an email address.

    The domain is case-insensitive. The local part is treated as
    case-sensitive per the RFC, but in practice every major provider treats
    it as case-insensitive, so we lowercase the whole address to keep one
    address to one account.
    """
    if raw is None:
        raise InvalidEmail("missing")

    email = raw.strip().lower()
    if not email:
        raise InvalidEmail("missing")
    if len(email) > MAX_EMAIL_LENGTH:
        raise InvalidEmail("too_long")
    if ".." in email:
        raise InvalidEmail("consecutive_dots")
    if not EMAIL_PATTERN.match(email):
        raise InvalidEmail("malformed")
    return email


def is_valid_email(raw: str | None) -> bool:
    """Boolean wrapper around :func:`normalize_email`."""
    try:
        normalize_email(raw)
    except InvalidEmail:
        return False
    return True


def mask_email(raw: str | None) -> str:
    """Mask an email for logs: ``a***@example.com``."""
    if not raw:
        return ""
    local, _, domain = raw.partition("@")
    if not domain:
        return "***"
    head = local[:1] if local else ""
    return f"{head}***@{domain}"

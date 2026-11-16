"""Rwandan phone number normalization.

The phone number is the primary identity key, so normalization has to be
unambiguous and has to be enforced in exactly one place. Every path that
accepts a phone number -- registration, login, invitations, contact lookup --
goes through :func:`normalize_phone`.

Accepted inputs (spaces, dashes, dots and parentheses are ignored)::

    0788123456
    788123456
    250788123456
    +250788123456
    +250 78 812 3456

Everything else is rejected. Numbers outside Rwanda are not supported in v1
because the operator prefix determines SMS routing and fraud scoring.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Final

#: Country calling code for Rwanda.
COUNTRY_CODE: Final = "250"

#: Operator prefixes in use in Rwanda, mapped to a stable internal name.
OPERATOR_BY_PREFIX: Final[dict[str, str]] = {
    "72": "airtel",
    "73": "airtel",
    "78": "mtn",
    "79": "mtn",
}

#: E.164 form: +250 then 9 digits beginning with a known operator prefix.
E164_PATTERN: Final = re.compile(r"^\+250(72|73|78|79)\d{7}$")

_SEPARATORS: Final = re.compile(r"[\s\-().]")


class InvalidPhoneNumber(ValueError):
    """Raised when a phone number cannot be normalized to Rwandan E.164."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


@dataclass(frozen=True, slots=True)
class NormalizedPhone:
    """A validated Rwandan phone number and its derived attributes."""

    e164: str
    """Canonical storage form, e.g. ``+250788123456``."""

    national: str
    """Local dialing form, e.g. ``0788123456``."""

    operator: str
    """``mtn`` or ``airtel``."""

    @property
    def masked(self) -> str:
        """Masked form safe to write to logs: ``+250788***456``."""
        return f"{self.e164[:7]}***{self.e164[-3:]}"

    @property
    def display_hint(self) -> str:
        """Human friendly grouping used in SMS templates."""
        digits = self.e164[4:]
        return f"+250 {digits[:2]} {digits[2:5]} {digits[5:]}"


def normalize_phone(raw: str | None) -> NormalizedPhone:
    """Normalize a user-supplied phone number to Rwandan E.164.

    Raises :class:`InvalidPhoneNumber` with a short machine-readable reason.
    """
    if raw is None:
        raise InvalidPhoneNumber("missing")

    cleaned = _SEPARATORS.sub("", raw.strip())
    if not cleaned:
        raise InvalidPhoneNumber("missing")

    # International prefix forms.
    if cleaned.startswith("+"):
        if not cleaned.startswith("+250"):
            raise InvalidPhoneNumber("not_rwanda")
        local = cleaned[4:]
    elif cleaned.startswith("00250"):
        local = cleaned[5:]
    elif cleaned.startswith("250") and len(cleaned) > 10:
        local = cleaned[3:]
    elif cleaned.startswith("0"):
        local = cleaned[1:]
    else:
        local = cleaned

    if not local.isdigit():
        raise InvalidPhoneNumber("not_numeric")
    if len(local) != 9:
        raise InvalidPhoneNumber("bad_length")
    if not local.startswith("7"):
        raise InvalidPhoneNumber("not_mobile")
    if local[:2] not in OPERATOR_BY_PREFIX:
        raise InvalidPhoneNumber("unknown_operator")

    e164 = f"+{COUNTRY_CODE}{local}"
    return NormalizedPhone(
        e164=e164,
        national=f"0{local}",
        operator=OPERATOR_BY_PREFIX[local[:2]],
    )


def is_valid_phone(raw: str | None) -> bool:
    """Boolean wrapper around :func:`normalize_phone`."""
    try:
        normalize_phone(raw)
    except InvalidPhoneNumber:
        return False
    return True


def mask_phone(raw: str | None) -> str:
    """Mask a phone number for logs. Never raises."""
    try:
        return normalize_phone(raw).masked
    except InvalidPhoneNumber:
        return "***"

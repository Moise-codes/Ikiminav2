"""Unit tests for Rwandan phone normalization."""

import pytest

from app.common.phone import InvalidPhoneNumber, normalize_phone


def test_local_leading_zero():
    assert normalize_phone("0788123456").e164 == "+250788123456"
    assert normalize_phone("0728123456").e164 == "+250728123456"
    assert normalize_phone("0738123456").e164 == "+250738123456"
    assert normalize_phone("0798123456").e164 == "+250798123456"


def test_international_plus():
    assert normalize_phone("+250788123456").e164 == "+250788123456"


def test_with_spaces_and_dashes():
    assert normalize_phone("+250 78 812 3456").e164 == "+250788123456"
    assert normalize_phone("078-812-3456").e164 == "+250788123456"


def test_country_code_without_plus():
    assert normalize_phone("250788123456").e164 == "+250788123456"


def test_operator_detection():
    assert normalize_phone("0788123456").operator == "mtn"
    assert normalize_phone("0798123456").operator == "mtn"
    assert normalize_phone("0728123456").operator == "airtel"
    assert normalize_phone("0738123456").operator == "airtel"


def test_masked_form_is_log_safe():
    masked = normalize_phone("0788123456").masked
    assert "788" in masked
    assert "456" in masked
    assert "812345" not in masked


@pytest.mark.parametrize("bad", ["078812345", "07881234567", "+250708123456", "+251788123456", "abc", "0718123456"])
def test_invalid_phones_rejected(bad):
    with pytest.raises(InvalidPhoneNumber):
        normalize_phone(bad)


def test_is_valid_phone():
    assert normalize_phone.is_valid_phone if hasattr(normalize_phone, "is_valid_phone") else True
    from app.common.phone import is_valid_phone
    assert is_valid_phone("0788123456") is True
    assert is_valid_phone("0718123456") is False
    assert is_valid_phone(None) is False

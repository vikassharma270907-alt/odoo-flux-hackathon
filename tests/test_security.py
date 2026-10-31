from app.security import validate_password_policy


def test_valid_password_passes():
    assert validate_password_policy("Abcdefg@1") == []


def test_short_password_rejected():
    errors = validate_password_policy("Ab@1")
    assert any("more than 8" in e for e in errors)


def test_missing_uppercase_rejected():
    assert any("uppercase" in e for e in validate_password_policy("abcdefg@1"))


def test_missing_lowercase_rejected():
    assert any("lowercase" in e for e in validate_password_policy("ABCDEFG@1"))


def test_missing_special_rejected():
    assert any("special" in e for e in validate_password_policy("Abcdefgh1"))

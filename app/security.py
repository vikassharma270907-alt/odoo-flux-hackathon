"""Password hashing, policy validation, and JWT helpers.

Primary implementations use `passlib[bcrypt]` and `python-jose`. If those
packages are not installed, we fall back to stdlib-only implementations
(PBKDF2-HMAC for hashing, a signed HMAC token for JWT) so the system still
runs in a constrained environment. Install the full requirements for the
production-grade bcrypt + JWT path.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import re
import secrets
from datetime import datetime, timedelta, timezone

from app.config import settings

_SPECIAL = re.compile(r"[^A-Za-z0-9]")
_UPPER = re.compile(r"[A-Z]")
_LOWER = re.compile(r"[a-z]")


# --------------------------------------------------------------------------- #
# Password hashing
# --------------------------------------------------------------------------- #
try:  # Preferred: bcrypt via passlib
    from passlib.context import CryptContext

    _pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    def hash_password(password: str) -> str:
        return _pwd_context.hash(password)

    def verify_password(plain: str, hashed: str) -> bool:
        return _pwd_context.verify(plain, hashed)

except Exception:  # Fallback: stdlib PBKDF2-HMAC-SHA256
    _ITERATIONS = 240_000

    def hash_password(password: str) -> str:
        salt = secrets.token_bytes(16)
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _ITERATIONS)
        return f"pbkdf2_sha256${_ITERATIONS}${salt.hex()}${dk.hex()}"

    def verify_password(plain: str, hashed: str) -> bool:
        try:
            _algo, iters, salt_hex, dk_hex = hashed.split("$")
            dk = hashlib.pbkdf2_hmac(
                "sha256", plain.encode(), bytes.fromhex(salt_hex), int(iters)
            )
            return hmac.compare_digest(dk.hex(), dk_hex)
        except (ValueError, AttributeError):
            return False


# --------------------------------------------------------------------------- #
# Password policy
# --------------------------------------------------------------------------- #
def validate_password_policy(password: str) -> list[str]:
    """Return a list of policy violations; empty list means valid.

    Policy (from the brief): more than 8 characters, with at least one
    uppercase letter, one lowercase letter, and one special character.
    """
    errors: list[str] = []
    if len(password) <= 8:
        errors.append("Password must be more than 8 characters long.")
    if not _UPPER.search(password):
        errors.append("Password must contain an uppercase letter.")
    if not _LOWER.search(password):
        errors.append("Password must contain a lowercase letter.")
    if not _SPECIAL.search(password):
        errors.append("Password must contain a special character.")
    return errors


# --------------------------------------------------------------------------- #
# Access tokens (JWT)
# --------------------------------------------------------------------------- #
def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


try:  # Preferred: python-jose
    from jose import JWTError, jwt

    def create_access_token(subject: str, role: str) -> str:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.access_token_expire_minutes
        )
        payload = {"sub": subject, "role": role, "exp": expire}
        return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

    def decode_access_token(token: str) -> dict | None:
        try:
            return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        except JWTError:
            return None

except Exception:  # Fallback: stdlib HS256-style signed token
    def create_access_token(subject: str, role: str) -> str:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.access_token_expire_minutes
        )
        header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
        payload = _b64url(
            json.dumps({"sub": subject, "role": role, "exp": int(expire.timestamp())}).encode()
        )
        signing_input = f"{header}.{payload}".encode()
        sig = hmac.new(settings.secret_key.encode(), signing_input, hashlib.sha256).digest()
        return f"{header}.{payload}.{_b64url(sig)}"

    def decode_access_token(token: str) -> dict | None:
        try:
            header, payload, sig = token.split(".")
            signing_input = f"{header}.{payload}".encode()
            expected = hmac.new(
                settings.secret_key.encode(), signing_input, hashlib.sha256
            ).digest()
            if not hmac.compare_digest(_b64url(expected), sig):
                return None
            claims = json.loads(_b64url_decode(payload))
            if claims.get("exp", 0) < datetime.now(timezone.utc).timestamp():
                return None
            return claims
        except (ValueError, json.JSONDecodeError):
            return None


def generate_reset_token() -> str:
    return secrets.token_urlsafe(32)

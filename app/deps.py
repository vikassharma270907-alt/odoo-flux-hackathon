"""Shared FastAPI dependencies: current user and role guards."""
from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Role, User
from app.security import decode_access_token


def _extract_token(request: Request) -> str | None:
    """Accept the JWT from either the Authorization header or the session cookie."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[len("Bearer ") :]
    return request.cookies.get("access_token")


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = _extract_token(request)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    user = db.query(User).filter(User.email == payload["sub"]).first()
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    return user


def get_current_user_optional(request: Request, db: Session = Depends(get_db)) -> User | None:
    try:
        return get_current_user(request, db)
    except HTTPException:
        return None


def require_roles(*roles: Role):
    """Dependency factory enforcing that the user has one of the given roles."""

    def guard(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Requires role: {', '.join(r.value for r in roles)}",
            )
        return user

    return guard


# Convenience guards
require_admin = require_roles(Role.admin)
require_staff = require_roles(Role.admin, Role.staff)

"""
IPS Security Module
JWT authentication, password hashing, RBAC enforcement.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.database.db import get_db

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


# ---------------------------------------------------------------------------
# Current user dependency
# ---------------------------------------------------------------------------

async def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer_scheme)],
    db: Session = Depends(get_db),
) -> "UserModel":  # type: ignore[name-defined]  # noqa: F821
    from backend.database.models import User

    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_token(credentials.credentials)
    user_id: Optional[int] = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def require_role(*roles: str):
    """FastAPI dependency factory that enforces role membership."""
    async def dependency(current_user=Depends(get_current_user)):
        if current_user.role.name not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {list(roles)}",
            )
        return current_user
    return dependency


# Convenience role guards
require_admin = require_role("Administrator")
require_manager_or_above = require_role("Administrator", "Manager")
require_supervisor_or_above = require_role("Administrator", "Manager", "Supervisor")


def require_module_read(module: str):
    """FastAPI dependency factory — returns 403 if user cannot read the given module.
    Administrator role always passes regardless of stored permissions."""
    async def dependency(current_user=Depends(get_current_user)):
        if current_user.role.name == "Administrator":
            return current_user
        has_read = any(
            p.module == module and p.can_read
            for p in current_user.role.permissions
        )
        if not has_read:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You do not have permission to access the '{module}' module.",
            )
        return current_user
    return dependency

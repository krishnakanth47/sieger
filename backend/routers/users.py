"""
IPS Users Router
User management, authentication, and RBAC permissions.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from backend.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    require_admin,
    require_manager_or_above,
    verify_password,
)
from backend.database.db import get_db
from backend.database.models import ActivityLog, Permission, Role, User

router = APIRouter(prefix="/users", tags=["users"])
logger = logging.getLogger(__name__)


# ─── Auth ──────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    full_name: str
    role: str
    permissions: dict


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    body: LoginRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == body.username, User.is_active == True).first()
    if not user or not verify_password(body.password, user.hashed_password):
        # Log failed attempt
        db.add(ActivityLog(
            username=body.username, role_name="unknown",
            ip_address=request.client.host if request.client else None,
            action_type="LOGIN_FAILED",
            module="auth",
            description=f"Failed login attempt for '{body.username}'",
        ))
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id)})
    user.last_login = datetime.utcnow()

    # Build permissions map
    perms = {p.module: {"read": p.can_read, "write": p.can_write, "delete": p.can_delete}
             for p in user.role.permissions}

    db.add(ActivityLog(
        user_id=user.id, username=user.username, role_name=user.role.name,
        ip_address=request.client.host if request.client else None,
        action_type="LOGIN", module="auth",
        description=f"User '{user.username}' logged in",
    ))
    db.commit()

    return TokenResponse(
        access_token=token,
        user_id=user.id,
        username=user.username,
        full_name=user.full_name,
        role=user.role.name,
        permissions=perms,
    )


@router.post("/logout")
async def logout(
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    db.add(ActivityLog(
        user_id=current_user.id, username=current_user.username,
        role_name=current_user.role.name,
        ip_address=request.client.host if request.client else None,
        action_type="LOGOUT", module="auth",
        description=f"User '{current_user.username}' logged out",
    ))
    db.commit()
    return {"status": "logged_out"}


# ─── User CRUD ─────────────────────────────────────────────────────────────

class UserCreateRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    full_name: str = Field(min_length=1, max_length=100)
    email: Optional[str] = None
    password: str = Field(min_length=6)
    role_id: int
    employee_id: Optional[str] = None
    department: Optional[str] = None


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None


@router.get("/")
async def list_users(
    db: Session = Depends(get_db),
    current_user=Depends(require_manager_or_above),
):
    users = db.query(User).all()
    return [
        {
            "id": u.id, "username": u.username, "full_name": u.full_name,
            "email": u.email, "role": u.role.name, "is_active": u.is_active,
            "employee_id": u.employee_id, "department": u.department,
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.post("/")
async def create_user(
    request: UserCreateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    existing = db.query(User).filter(User.username == request.username).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")

    role = db.query(Role).filter(Role.id == request.role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    user = User(
        username=request.username,
        full_name=request.full_name,
        email=request.email,
        hashed_password=hash_password(request.password),
        role_id=request.role_id,
        employee_id=request.employee_id,
        department=request.department,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    db.add(ActivityLog(
        user_id=current_user.id, username=current_user.username,
        role_name=current_user.role.name, action_type="CREATE",
        module="user_management",
        description=f"Created user '{request.username}' with role '{role.name}'",
    ))
    db.commit()
    return {"id": user.id, "username": user.username, "role": role.name}


@router.patch("/{user_id}")
async def update_user(
    user_id: int,
    request: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_manager_or_above),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for field, value in request.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()

    db.add(ActivityLog(
        user_id=current_user.id, username=current_user.username,
        role_name=current_user.role.name, action_type="PARAMETER_CHANGE",
        module="user_management",
        description=f"Updated user '{user.username}'",
    ))
    db.commit()
    return {"status": "updated"}


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    username = user.username
    db.delete(user)
    db.commit()

    db.add(ActivityLog(
        user_id=current_user.id, username=current_user.username,
        role_name=current_user.role.name, action_type="DELETE",
        module="user_management",
        description=f"Deleted user '{username}'",
    ))
    db.commit()
    return {"status": "deleted"}


@router.post("/{user_id}/reset-password")
async def reset_password(
    user_id: int,
    new_password: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = hash_password(new_password)
    db.commit()
    return {"status": "password_reset"}


# ─── Roles & Permissions ───────────────────────────────────────────────────

@router.get("/roles")
async def list_roles(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    roles = db.query(Role).all()
    return [{"id": r.id, "name": r.name, "description": r.description} for r in roles]


class PermissionUpdateRequest(BaseModel):
    permissions: list[dict]  # [{module, can_read, can_write, can_delete}]


@router.put("/roles/{role_id}/permissions")
async def update_role_permissions(
    role_id: int,
    request: PermissionUpdateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    for perm_data in request.permissions:
        module = perm_data.get("module")
        perm = db.query(Permission).filter(
            Permission.role_id == role_id, Permission.module == module
        ).first()
        if perm:
            perm.can_read = perm_data.get("can_read", perm.can_read)
            perm.can_write = perm_data.get("can_write", perm.can_write)
            perm.can_delete = perm_data.get("can_delete", perm.can_delete)
        else:
            db.add(Permission(
                role_id=role_id, module=module,
                can_read=perm_data.get("can_read", True),
                can_write=perm_data.get("can_write", False),
                can_delete=perm_data.get("can_delete", False),
            ))

    db.commit()
    db.add(ActivityLog(
        user_id=current_user.id, username=current_user.username,
        role_name=current_user.role.name, action_type="PARAMETER_CHANGE",
        module="user_management",
        description=f"Updated permissions for role '{role.name}'",
    ))
    db.commit()
    return {"status": "permissions_updated"}


@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role.name,
        "employee_id": current_user.employee_id,
        "department": current_user.department,
    }

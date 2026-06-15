"""
IPS Activity Log Router
Read-only paginated audit trail.
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.core.security import get_current_user
from backend.database.db import get_db
from backend.database.models import ActivityLog

router = APIRouter(prefix="/activity-log", tags=["activity_log"])
logger = logging.getLogger(__name__)


@router.get("/")
async def get_activity_log(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    user_id: Optional[int] = None,
    action_type: Optional[str] = None,
    module: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return paginated, filterable audit log."""
    q = db.query(ActivityLog)
    if user_id:
        q = q.filter(ActivityLog.user_id == user_id)
    if action_type:
        q = q.filter(ActivityLog.action_type == action_type.upper())
    if module:
        q = q.filter(ActivityLog.module == module)

    total = q.count()
    offset = (page - 1) * page_size
    logs = q.order_by(ActivityLog.timestamp.desc()).offset(offset).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
        "data": [
            {
                "id": log.id,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "user_id": log.user_id,
                "username": log.username,
                "role_name": log.role_name,
                "ip_address": log.ip_address,
                "action_type": log.action_type,
                "module": log.module,
                "description": log.description,
            }
            for log in logs
        ],
    }


@router.get("/action-types")
async def get_action_types(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return distinct action types for filter dropdowns."""
    from sqlalchemy import distinct
    types = db.query(distinct(ActivityLog.action_type)).all()
    return [t[0] for t in types if t[0]]


@router.get("/stats")
async def get_log_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Summary statistics for the activity log."""
    from sqlalchemy import func
    total = db.query(func.count(ActivityLog.id)).scalar() or 0
    logins = db.query(func.count(ActivityLog.id)).filter(ActivityLog.action_type == "LOGIN").scalar() or 0
    param_changes = db.query(func.count(ActivityLog.id)).filter(ActivityLog.action_type == "PARAMETER_CHANGE").scalar() or 0
    exports = db.query(func.count(ActivityLog.id)).filter(ActivityLog.action_type == "EXPORT_REPORT").scalar() or 0
    return {
        "total_events": total,
        "logins": logins,
        "parameter_changes": param_changes,
        "exports": exports,
    }

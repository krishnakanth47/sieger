"""
IPS Teaching Router
Manages CV feature toggles, ROI configuration, and tolerance matrix.
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.core.security import get_current_user
from backend.core.state_machine import state_machine
from backend.database.db import get_db
from backend.database.models import ActivityLog, Pattern, ToleranceSettings

router = APIRouter(prefix="/teaching", tags=["teaching"])
logger = logging.getLogger(__name__)


def _check_not_locked():
    if state_machine.is_module_locked("teaching"):
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail={
                "message": "Access Denied: Halt live inspection line operations before altering core system configurations.",
                "current_state": state_machine.state.value,
            },
        )


class ToleranceUpdateRequest(BaseModel):
    pattern_id: Optional[int] = None
    required_cone_diameter_mm: float = Field(default=190.0, ge=50.0, le=500.0)
    cone_tolerance_mm: float = Field(default=5.0, ge=0.1, le=50.0)
    required_tube_diameter_mm: float = Field(default=42.0, ge=10.0, le=200.0)
    tube_tolerance_mm: float = Field(default=2.0, ge=0.1, le=20.0)
    enable_extraction: bool = True
    enable_tube_pattern: bool = True
    enable_stain_detection: bool = True
    enable_thread_mix_detection: bool = True
    roi_x: float = Field(default=0.1, ge=0.0, le=1.0)
    roi_y: float = Field(default=0.1, ge=0.0, le=1.0)
    roi_width: float = Field(default=0.8, ge=0.1, le=1.0)
    roi_height: float = Field(default=0.8, ge=0.1, le=1.0)


@router.get("/tolerance")
async def get_tolerance(
    pattern_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get current tolerance settings (global or pattern-specific)."""
    q = db.query(ToleranceSettings)
    if pattern_id:
        tol = q.filter(ToleranceSettings.pattern_id == pattern_id).first()
    else:
        tol = q.filter(ToleranceSettings.pattern_id.is_(None)).first()

    if not tol:
        tol = ToleranceSettings()

    return {
        "pattern_id": tol.pattern_id,
        "required_cone_diameter_mm": tol.required_cone_diameter_mm,
        "cone_tolerance_mm": tol.cone_tolerance_mm,
        "required_tube_diameter_mm": tol.required_tube_diameter_mm,
        "tube_tolerance_mm": tol.tube_tolerance_mm,
        "enable_extraction": tol.enable_extraction,
        "enable_tube_pattern": tol.enable_tube_pattern,
        "enable_stain_detection": tol.enable_stain_detection,
        "enable_thread_mix_detection": tol.enable_thread_mix_detection,
        "roi": {
            "x": tol.roi_x, "y": tol.roi_y,
            "width": tol.roi_width, "height": tol.roi_height,
        },
    }


@router.put("/tolerance")
async def update_tolerance(
    request: ToleranceUpdateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _check_not_locked()

    q = db.query(ToleranceSettings)
    if request.pattern_id:
        tol = q.filter(ToleranceSettings.pattern_id == request.pattern_id).first()
    else:
        tol = q.filter(ToleranceSettings.pattern_id.is_(None)).first()

    if not tol:
        tol = ToleranceSettings()
        db.add(tol)

    tol.pattern_id = request.pattern_id
    tol.required_cone_diameter_mm = request.required_cone_diameter_mm
    tol.cone_tolerance_mm = request.cone_tolerance_mm
    tol.required_tube_diameter_mm = request.required_tube_diameter_mm
    tol.tube_tolerance_mm = request.tube_tolerance_mm
    tol.enable_extraction = request.enable_extraction
    tol.enable_tube_pattern = request.enable_tube_pattern
    tol.enable_stain_detection = request.enable_stain_detection
    tol.enable_thread_mix_detection = request.enable_thread_mix_detection
    tol.roi_x = request.roi_x
    tol.roi_y = request.roi_y
    tol.roi_width = request.roi_width
    tol.roi_height = request.roi_height

    db.commit()

    db.add(ActivityLog(
        user_id=current_user.id, username=current_user.username,
        role_name=current_user.role.name, action_type="PARAMETER_CHANGE",
        module="teaching",
        description=(
            f"Updated tolerance: cone={request.required_cone_diameter_mm}±{request.cone_tolerance_mm}mm, "
            f"tube={request.required_tube_diameter_mm}±{request.tube_tolerance_mm}mm"
        ),
    ))
    db.commit()
    return {"status": "updated"}


@router.get("/patterns")
async def get_patterns_for_teaching(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List patterns eligible for teaching (image_count >= 10)."""
    from backend.routers.data_capture import MIN_IMAGES_REQUIRED
    patterns = db.query(Pattern).filter(Pattern.image_count >= MIN_IMAGES_REQUIRED).all()
    return [{"id": p.id, "name": p.name, "image_count": p.image_count} for p in patterns]

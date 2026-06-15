"""
IPS Settings Router
Camera, PLC, shift, and illumination configuration management.
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.core.security import get_current_user, require_manager_or_above
from backend.core.state_machine import state_machine
from backend.database.db import get_db
from backend.database.models import (
    ActivityLog,
    CameraConfiguration,
    IlluminationState,
    PLCConfiguration,
    Setting,
    Shift,
)

router = APIRouter(prefix="/settings", tags=["settings"])
logger = logging.getLogger(__name__)

MAX_SHIFTS = 3


def _check_not_locked():
    if state_machine.is_module_locked("settings"):
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail={
                "message": "Access Denied: Halt live inspection line operations before altering core system configurations.",
                "current_state": state_machine.state.value,
            },
        )


# ─── Camera Configuration ──────────────────────────────────────────────────

class CameraUpdateRequest(BaseModel):
    ip_address: Optional[str] = None
    port: Optional[int] = Field(default=None, ge=1, le=65535)
    username: Optional[str] = None
    password: Optional[str] = None
    stream_url: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/cameras")
async def get_cameras(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    cameras = db.query(CameraConfiguration).all()
    return [
        {
            "id": c.id, "camera_name": c.camera_name,
            "ip_address": c.ip_address, "port": c.port,
            "stream_url": c.stream_url, "is_active": c.is_active,
            "last_connected": c.last_connected.isoformat() if c.last_connected else None,
        }
        for c in cameras
    ]


@router.put("/cameras/{camera_name}")
async def update_camera(
    camera_name: str,
    request: CameraUpdateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _check_not_locked()
    cam = db.query(CameraConfiguration).filter(CameraConfiguration.camera_name == camera_name).first()
    if not cam:
        raise HTTPException(status_code=404, detail=f"Camera '{camera_name}' not found")

    for field, value in request.model_dump(exclude_none=True).items():
        setattr(cam, field, value)
    db.commit()

    db.add(ActivityLog(
        user_id=current_user.id, username=current_user.username,
        role_name=current_user.role.name, action_type="PARAMETER_CHANGE",
        module="settings", description=f"Updated camera '{camera_name}' configuration",
    ))
    db.commit()
    return {"status": "updated"}


# ─── PLC Configuration ─────────────────────────────────────────────────────

class PLCUpdateRequest(BaseModel):
    host: Optional[str] = None
    port: Optional[int] = Field(default=None, ge=1, le=65535)
    unit_id: Optional[int] = None
    basket_id_register: Optional[int] = None
    machine_id_register: Optional[int] = None
    material_id_register: Optional[int] = None


@router.get("/plc")
async def get_plc(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    plc = db.query(PLCConfiguration).first()
    if not plc:
        return {}
    return {
        "id": plc.id, "host": plc.host, "port": plc.port, "unit_id": plc.unit_id,
        "basket_id_register": plc.basket_id_register,
        "machine_id_register": plc.machine_id_register,
        "material_id_register": plc.material_id_register,
        "is_active": plc.is_active,
        "last_connected": plc.last_connected.isoformat() if plc.last_connected else None,
    }


@router.put("/plc")
async def update_plc(
    request: PLCUpdateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _check_not_locked()
    plc = db.query(PLCConfiguration).first()
    if not plc:
        plc = PLCConfiguration()
        db.add(plc)

    for field, value in request.model_dump(exclude_none=True).items():
        setattr(plc, field, value)
    db.commit()

    db.add(ActivityLog(
        user_id=current_user.id, username=current_user.username,
        role_name=current_user.role.name, action_type="PARAMETER_CHANGE",
        module="settings", description=f"Updated PLC configuration (host={plc.host})",
    ))
    db.commit()
    return {"status": "updated"}


# ─── Shift Configuration ───────────────────────────────────────────────────

class ShiftRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    start_time: str  # "06:00:00"
    end_time: str
    is_active: bool = True


@router.get("/shifts")
async def get_shifts(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    shifts = db.query(Shift).all()
    return [
        {"id": s.id, "name": s.name, "start_time": s.start_time, "end_time": s.end_time, "is_active": s.is_active}
        for s in shifts
    ]


@router.post("/shifts")
async def create_shift(
    request: ShiftRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _check_not_locked()
    current_count = db.query(Shift).count()
    if current_count >= MAX_SHIFTS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Maximum number of shifts ({MAX_SHIFTS}) reached.",
        )
    shift = Shift(**request.model_dump())
    db.add(shift)
    db.commit()
    return {"id": shift.id, "name": shift.name}


@router.put("/shifts/{shift_id}")
async def update_shift(
    shift_id: int,
    request: ShiftRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _check_not_locked()
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    for f, v in request.model_dump().items():
        setattr(shift, f, v)
    db.commit()
    return {"status": "updated"}


@router.delete("/shifts/{shift_id}")
async def delete_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _check_not_locked()
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    db.delete(shift)
    db.commit()
    return {"status": "deleted"}


# ─── Illumination Control ──────────────────────────────────────────────────

class IlluminationUpdateRequest(BaseModel):
    master_enabled: Optional[bool] = None
    visible_light: Optional[bool] = None
    uv_light: Optional[bool] = None
    yarn_tail_light: Optional[bool] = None


@router.get("/illumination")
async def get_illumination(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    state = db.query(IlluminationState).first()
    if not state:
        return {"master_enabled": False, "visible_light": False, "uv_light": False, "yarn_tail_light": False}
    return {
        "master_enabled": state.master_enabled,
        "visible_light": state.visible_light,
        "uv_light": state.uv_light,
        "yarn_tail_light": state.yarn_tail_light,
    }


@router.patch("/illumination")
async def update_illumination(
    request: IlluminationUpdateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    state = db.query(IlluminationState).first()
    if not state:
        state = IlluminationState()
        db.add(state)

    for field, value in request.model_dump(exclude_none=True).items():
        setattr(state, field, value)

    # If master is off, force all lights off
    if state.master_enabled is False:
        state.visible_light = False
        state.uv_light = False
        state.yarn_tail_light = False

    db.commit()

    db.add(ActivityLog(
        user_id=current_user.id, username=current_user.username,
        role_name=current_user.role.name, action_type="PARAMETER_CHANGE",
        module="settings",
        description=f"Illumination updated: master={state.master_enabled}",
    ))
    db.commit()
    return {
        "master_enabled": state.master_enabled,
        "visible_light": state.visible_light,
        "uv_light": state.uv_light,
        "yarn_tail_light": state.yarn_tail_light,
    }


# ─── General Settings ──────────────────────────────────────────────────────

@router.get("/general")
async def get_general_settings(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    settings_rows = db.query(Setting).all()
    return {s.key: s.value for s in settings_rows}


@router.put("/general/{key}")
async def update_setting(
    key: str,
    value: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _check_not_locked()
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        setting = Setting(key=key)
        db.add(setting)
    setting.value = value
    setting.updated_by = current_user.id
    db.commit()
    return {"key": key, "value": value}

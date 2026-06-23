"""
IPS Data Capture Router
Manages image capture sessions and pattern lifecycle.
"""
from __future__ import annotations

import logging
import re
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.core.security import get_current_user, require_module_read
from backend.core.state_machine import SystemState, state_machine
from backend.database.db import get_db
from backend.database.models import ActivityLog, CapturedImage, Pattern

router = APIRouter(prefix="/data-capture", tags=["data_capture"])
logger = logging.getLogger(__name__)

PATTERN_NAME_RE = re.compile(r"^[a-z0-9][a-z0-9\-]{1,48}[a-z0-9]$")
MIN_IMAGES_REQUIRED = 10


class PatternCreateRequest(BaseModel):
    name: str
    description: str = ""

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not PATTERN_NAME_RE.match(v):
            raise ValueError(
                "Pattern name must be lowercase alphanumeric with hyphens only, 3–50 chars."
            )
        return v


class PatternRenameRequest(BaseModel):
    new_name: str

    @field_validator("new_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not PATTERN_NAME_RE.match(v):
            raise ValueError("Pattern name must be lowercase alphanumeric with hyphens only.")
        return v


def _check_not_locked():
    if state_machine.is_module_locked("data_capture"):
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail={
                "message": "Access Denied: Halt live inspection line operations before altering core system configurations.",
                "current_state": state_machine.state.value,
            },
        )


@router.post("/capture-image")
async def capture_image(
    pattern_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_module_read("data_capture")),
):
    """Simulate capturing one frame and saving it to the staging directory."""
    _check_not_locked()
    pattern = db.query(Pattern).filter(Pattern.id == pattern_id).first()
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")

    # Change to DATA_CAPTURING state if idle
    if state_machine.state == SystemState.IDLE:
        await state_machine.transition(SystemState.DATA_CAPTURING)

    pattern_dir = settings.CAPTURE_STAGING_DIR / str(pattern.name)
    pattern_dir.mkdir(parents=True, exist_ok=True)
    image_idx = int(pattern.image_count) + 1
    filename = f"{str(pattern.name)}_{image_idx:04d}.jpg"
    filepath = pattern_dir / filename

    # Mock: write a placeholder file (in production: save real frame)
    filepath.write_bytes(b"\xff\xd8\xff\xe0" + b"\x00" * 200 + b"\xff\xd9")

    captured = CapturedImage(
        pattern_id=pattern.id,
        file_path=str(filepath),
        file_size_kb=round(filepath.stat().st_size / 1024, 2),
    )
    db.add(captured)
    pattern.image_count = image_idx  # type: ignore
    db.commit()

    db.add(ActivityLog(
        user_id=current_user.id, username=current_user.username,
        role_name=current_user.role.name, action_type="CAPTURE_IMAGE",
        module="data_capture",
        description=f"Captured image {image_idx} for pattern '{str(pattern.name)}'",
    ))
    db.commit()

    return {
        "image_count": image_idx,
        "min_required": MIN_IMAGES_REQUIRED,
        "ready": image_idx >= MIN_IMAGES_REQUIRED,
        "filename": filename,
    }


@router.post("/patterns")
async def create_pattern(
    request: PatternCreateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_module_read("data_capture")),
):
    _check_not_locked()
    existing = db.query(Pattern).filter(Pattern.name == request.name).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Pattern '{request.name}' already exists.")

    pattern = Pattern(name=request.name, description=request.description, created_by=current_user.id)
    db.add(pattern)
    db.commit()
    db.refresh(pattern)

    # Create staging directory
    (settings.CAPTURE_STAGING_DIR / request.name).mkdir(parents=True, exist_ok=True)

    db.add(ActivityLog(
        user_id=current_user.id, username=current_user.username,
        role_name=current_user.role.name, action_type="CREATE_PATTERN",
        module="data_capture", description=f"Created pattern '{request.name}'",
    ))
    db.commit()
    return {"id": pattern.id, "name": pattern.name, "image_count": 0}


@router.get("/patterns")
async def list_patterns(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    patterns = db.query(Pattern).order_by(Pattern.created_at.desc()).all()
    return [
        {
            "id": p.id, "name": p.name, "description": p.description,
            "image_count": p.image_count, "status": p.status,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "ready": p.image_count >= MIN_IMAGES_REQUIRED,
        }
        for p in patterns
    ]


@router.patch("/patterns/{pattern_id}/rename")
async def rename_pattern(
    pattern_id: int,
    request: PatternRenameRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_module_read("data_capture")),
):
    _check_not_locked()
    pattern = db.query(Pattern).filter(Pattern.id == pattern_id).first()
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")

    conflict = db.query(Pattern).filter(Pattern.name == request.new_name).first()
    if conflict:
        raise HTTPException(status_code=409, detail="Pattern name already in use")

    old_name = str(pattern.name)
    old_dir = settings.CAPTURE_STAGING_DIR / old_name
    new_dir = settings.CAPTURE_STAGING_DIR / request.new_name
    if old_dir.exists():
        old_dir.rename(new_dir)

    pattern.name = request.new_name  # type: ignore
    db.commit()

    db.add(ActivityLog(
        user_id=current_user.id, username=current_user.username,
        role_name=current_user.role.name, action_type="RENAME_PATTERN",
        module="data_capture",
        description=f"Renamed pattern '{old_name}' → '{request.new_name}'",
    ))
    db.commit()
    return {"status": "renamed", "new_name": request.new_name}


@router.delete("/patterns/{pattern_id}")
async def delete_pattern(
    pattern_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_module_read("data_capture")),
):
    _check_not_locked()
    pattern = db.query(Pattern).filter(Pattern.id == pattern_id).first()
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")

    pattern_dir = settings.CAPTURE_STAGING_DIR / str(pattern.name)
    if pattern_dir.exists():
        shutil.rmtree(pattern_dir)

    db.delete(pattern)
    db.commit()

    db.add(ActivityLog(
        user_id=current_user.id, username=current_user.username,
        role_name=current_user.role.name, action_type="DELETE_PATTERN",
        module="data_capture", description=f"Deleted pattern '{str(pattern.name)}' and all images",
    ))
    db.commit()
    return {"status": "deleted"}


@router.post("/patterns/{pattern_id}/clear-staging")
async def clear_staging(
    pattern_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_module_read("data_capture")),
):
    """Clear captured images from DB and return raw files to staging."""
    _check_not_locked()
    pattern = db.query(Pattern).filter(Pattern.id == pattern_id).first()
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")

    db.query(CapturedImage).filter(CapturedImage.pattern_id == pattern_id).delete()
    pattern.image_count = 0  # type: ignore
    db.commit()
    return {"status": "cleared", "pattern": str(pattern.name)}


@router.get("/staging-stats")
async def staging_stats(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    total_patterns = db.query(Pattern).count()
    total_images = db.query(CapturedImage).count()
    return {
        "total_patterns": total_patterns,
        "total_captured_images": total_images,
        "staging_dir": str(settings.CAPTURE_STAGING_DIR),
    }

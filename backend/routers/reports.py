"""
IPS Reports Router
Filtered report generation with CSV and PDF export.
"""
from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.core.security import get_current_user
from backend.database.db import get_db
from backend.database.models import ActivityLog, Report
from backend.services.report_service import (
    build_query,
    export_csv,
    export_pdf,
    to_dataframe,
)

router = APIRouter(prefix="/reports", tags=["reports"])
logger = logging.getLogger(__name__)


@router.get("/")
async def get_report_data(
    start_date: Optional[str] = Query(default=None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(default=None, description="YYYY-MM-DD"),
    shift_id: Optional[int] = None,
    machine_id: Optional[int] = None,
    material_id: Optional[int] = None,
    status: Optional[str] = Query(default=None, description="PASS | FAIL | ALL"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return paginated inspection report data with applied filters."""
    start = datetime.strptime(start_date, "%Y-%m-%d") if start_date else None
    end = datetime.strptime(end_date, "%Y-%m-%d") if end_date else None
    status_filter = None if status == "ALL" else status

    results = build_query(db, start, end, shift_id, machine_id, material_id, status_filter)
    total = len(results)
    offset = (page - 1) * page_size
    page_results = results[offset : offset + page_size]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
        "data": [
            {
                "id": r.id,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "status": r.status,
                "cone_diameter_mm": r.cone_diameter_mm,
                "tube_diameter_mm": r.tube_diameter_mm,
                "pattern_matched": r.pattern_matched,
                "stain_detected": r.stain_detected,
                "thread_mix_detected": r.thread_mix_detected,
                "yarn_tail_present": r.yarn_tail_present,
                "basket_id": r.basket_id,
                "machine_id": r.machine_id,
                "shift_id": r.shift_id,
            }
            for r in page_results
        ],
    }


@router.post("/export/csv")
async def export_report_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    shift_id: Optional[int] = None,
    machine_id: Optional[int] = None,
    material_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    start = datetime.strptime(start_date, "%Y-%m-%d") if start_date else None
    end = datetime.strptime(end_date, "%Y-%m-%d") if end_date else None
    results = build_query(db, start, end, shift_id, machine_id, material_id, status)
    df = to_dataframe(results)
    path = export_csv(df)

    db.add(Report(
        report_type="inspection", generated_by=current_user.id,
        file_path=str(path), file_format="csv", row_count=len(df),
    ))
    db.add(ActivityLog(
        user_id=current_user.id, username=current_user.username,
        role_name=current_user.role.name, action_type="EXPORT_REPORT",
        module="reports", description=f"Exported CSV report ({len(df)} rows)",
    ))
    db.commit()

    return FileResponse(
        path=str(path),
        media_type="text/csv",
        filename=path.name,
    )


@router.post("/export/pdf")
async def export_report_pdf(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    shift_id: Optional[int] = None,
    machine_id: Optional[int] = None,
    material_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    start = datetime.strptime(start_date, "%Y-%m-%d") if start_date else None
    end = datetime.strptime(end_date, "%Y-%m-%d") if end_date else None
    results = build_query(db, start, end, shift_id, machine_id, material_id, status)
    df = to_dataframe(results)
    path = export_pdf(df)

    db.add(Report(
        report_type="inspection", generated_by=current_user.id,
        file_path=str(path), file_format="pdf", row_count=len(df),
    ))
    db.add(ActivityLog(
        user_id=current_user.id, username=current_user.username,
        role_name=current_user.role.name, action_type="EXPORT_REPORT",
        module="reports", description=f"Exported PDF report ({len(df)} rows)",
    ))
    db.commit()

    return FileResponse(
        path=str(path),
        media_type="application/pdf",
        filename=path.name,
    )


@router.get("/history")
async def get_report_history(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List previously generated reports."""
    reports = db.query(Report).order_by(Report.generated_at.desc()).limit(50).all()
    return [
        {
            "id": r.id, "report_type": r.report_type,
            "generated_at": r.generated_at.isoformat() if r.generated_at else None,
            "file_format": r.file_format, "row_count": r.row_count,
        }
        for r in reports
    ]

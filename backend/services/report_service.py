"""
IPS Report Service
Pandas-based CSV and PDF report generation.
"""
from __future__ import annotations

import csv
import io
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.database.models import InspectionResult, Shift

logger = logging.getLogger(__name__)

_REPORTS_DIR = settings.DATA_DIR / "reports"
_REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def build_query(
    db: Session,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    shift_id: Optional[int] = None,
    machine_id: Optional[int] = None,
    material_id: Optional[int] = None,
    status: Optional[str] = None,
) -> list[InspectionResult]:
    q = db.query(InspectionResult)
    if start_date:
        q = q.filter(InspectionResult.timestamp >= start_date)
    if end_date:
        q = q.filter(InspectionResult.timestamp <= end_date)
    if shift_id:
        q = q.filter(InspectionResult.shift_id == shift_id)
    if machine_id:
        q = q.filter(InspectionResult.machine_id == machine_id)
    if material_id:
        q = q.filter(InspectionResult.material_id == material_id)
    if status and status.upper() in ("PASS", "FAIL"):
        q = q.filter(InspectionResult.status == status.upper())
    return q.order_by(InspectionResult.timestamp.desc()).all()


def to_dataframe(results: list[InspectionResult]) -> pd.DataFrame:
    rows = []
    for r in results:
        rows.append({
            "id": r.id,
            "timestamp": r.timestamp,
            "status": r.status,
            "cone_diameter_mm": r.cone_diameter_mm,
            "tube_diameter_mm": r.tube_diameter_mm,
            "pattern_matched": r.pattern_matched,
            "stain_detected": r.stain_detected,
            "thread_mix_detected": r.thread_mix_detected,
            "yarn_tail_present": r.yarn_tail_present,
            "machine_id": r.machine_id,
            "material_id": r.material_id,
            "shift_id": r.shift_id,
            "basket_id": r.basket_id,
        })
    return pd.DataFrame(rows)


def export_csv(df: pd.DataFrame, filename: Optional[str] = None) -> Path:
    if filename is None:
        filename = f"report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    path = _REPORTS_DIR / filename
    df.to_csv(path, index=False)
    logger.info("CSV exported: %s (%d rows)", path, len(df))
    return path


def export_pdf(df: pd.DataFrame, filename: Optional[str] = None) -> Path:
    """Generate PDF report using reportlab."""
    if filename is None:
        filename = f"report_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"
    path = _REPORTS_DIR / filename

    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.platypus import (
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
        )

        doc = SimpleDocTemplate(str(path), pagesize=landscape(A4))
        styles = getSampleStyleSheet()
        elements = []

        # Title
        elements.append(Paragraph("SIEGER — Cone Inspection Report", styles["Title"]))
        elements.append(Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", styles["Normal"]))
        elements.append(Spacer(1, 10 * mm))

        # Summary stats
        total = len(df)
        passed = len(df[df["status"] == "PASS"]) if "status" in df.columns else 0
        failed = total - passed
        summary_data = [
            ["Metric", "Value"],
            ["Total Inspected", total],
            ["Passed", passed],
            ["Failed", failed],
            ["Pass Rate", f"{(passed/total*100):.1f}%" if total > 0 else "N/A"],
        ]
        summary_table = Table(summary_data, colWidths=[60 * mm, 40 * mm])
        summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a2e1a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f5f5f5")),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 8 * mm))

        # Data table (first 500 rows to keep PDF manageable)
        if not df.empty:
            columns = ["id", "timestamp", "status", "cone_diameter_mm", "tube_diameter_mm", "pattern_matched"]
            table_df = df[columns].head(500)
            data = [list(table_df.columns)] + table_df.values.tolist()
            data_table = Table(data, repeatRows=1)
            data_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2d5a27")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f7f0")]),
            ]))
            elements.append(data_table)

        doc.build(elements)
        logger.info("PDF exported: %s", path)

    except ImportError:
        logger.warning("reportlab not installed — generating plain text PDF fallback")
        path.write_text(f"IPS Report\nGenerated: {datetime.utcnow()}\nRows: {len(df)}\n\n{df.to_string()}")

    return path


def get_analytics_data(db: Session) -> dict:
    """Return aggregated metrics for the Analytics view."""
    from sqlalchemy import func
    total = db.query(func.count(InspectionResult.id)).scalar() or 0
    passed = db.query(func.count(InspectionResult.id)).filter(InspectionResult.status == "PASS").scalar() or 0
    failed = total - passed
    stains = db.query(func.count(InspectionResult.id)).filter(InspectionResult.stain_detected == True).scalar() or 0
    thread_mix = db.query(func.count(InspectionResult.id)).filter(InspectionResult.thread_mix_detected == True).scalar() or 0
    yarn_tail = db.query(func.count(InspectionResult.id)).filter(InspectionResult.yarn_tail_present == False).scalar() or 0

    return {
        "total": total,
        "passed": passed,
        "failed": failed,
        "pass_rate": round(passed / total * 100, 1) if total > 0 else 0,
        "stain_count": stains,
        "thread_mix_count": thread_mix,
        "yarn_tail_faults": yarn_tail,
    }

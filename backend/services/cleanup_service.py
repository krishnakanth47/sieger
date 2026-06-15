"""
IPS Image Retention Cleanup Service
Runs hourly to enforce storage policies.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.database.db import SessionLocal
from backend.database.models import ActivityLog, Defect, InspectionResult

logger = logging.getLogger(__name__)


class CleanupService:
    """
    Hourly image retention enforcer.

    Policy:
    - Delete raw inspection images older than `retention_days` days.
    - If total defect image records exceed `max_failure_images`, wipe oldest batch.
    - Never delete database rows — only filesystem files.
    - Log every cleanup event to activity_logs.
    """

    def __init__(
        self,
        retention_days: int = settings.IMAGE_RETENTION_DAYS,
        max_failure_images: int = settings.MAX_FAILURE_IMAGES,
    ) -> None:
        self.retention_days = retention_days
        self.max_failure_images = max_failure_images

    async def run(self) -> dict:
        """Execute the full cleanup cycle."""
        logger.info("[Cleanup] Starting hourly image retention sweep...")
        stats = {"deleted_files": 0, "freed_bytes": 0, "errors": 0}

        db: Session = SessionLocal()
        try:
            # Rule 1: Delete images older than retention_days
            cutoff = datetime.utcnow() - timedelta(days=self.retention_days)
            stats.update(await self._delete_old_inspection_images(db, cutoff))

            # Rule 2: If failure image count exceeds threshold, delete oldest batch
            failure_count = db.query(Defect).count()
            if failure_count > self.max_failure_images:
                stats.update(await self._purge_excess_failure_images(db, failure_count))

            # Log the event
            self._log_cleanup(db, stats)
            db.commit()

        except Exception as exc:
            logger.error("[Cleanup] Error: %s", exc)
            db.rollback()
            stats["errors"] += 1
        finally:
            db.close()

        logger.info("[Cleanup] Complete. Stats: %s", stats)
        return stats

    async def _delete_old_inspection_images(self, db: Session, cutoff: datetime) -> dict:
        """Delete image files from inspection_results older than cutoff."""
        deleted = 0
        freed = 0

        results = (
            db.query(InspectionResult)
            .filter(
                InspectionResult.timestamp < cutoff,
                InspectionResult.image_path.isnot(None),
            )
            .all()
        )

        for result in results:
            path = Path(result.image_path)
            if path.exists():
                try:
                    size = path.stat().st_size
                    path.unlink()
                    freed += size
                    deleted += 1
                except Exception as exc:
                    logger.warning("[Cleanup] Could not delete %s: %s", path, exc)
            # Null out the path so we don't re-attempt
            result.image_path = None

        # Also clean defect images
        defects = (
            db.query(Defect)
            .join(InspectionResult)
            .filter(InspectionResult.timestamp < cutoff)
            .all()
        )
        for defect in defects:
            if defect.image_path:
                path = Path(defect.image_path)
                if path.exists():
                    try:
                        size = path.stat().st_size
                        path.unlink()
                        freed += size
                        deleted += 1
                    except Exception as exc:
                        logger.warning("[Cleanup] Could not delete defect image %s: %s", path, exc)
                defect.image_path = None

        logger.info("[Cleanup] Deleted %d old images (%.1f KB freed)", deleted, freed / 1024)
        return {"deleted_files": deleted, "freed_bytes": freed}

    async def _purge_excess_failure_images(self, db: Session, current_count: int) -> dict:
        """Purge oldest 200 failure images when threshold exceeded."""
        deleted = 0
        freed = 0
        batch_size = 200

        oldest_defects = (
            db.query(Defect)
            .filter(Defect.image_path.isnot(None))
            .order_by(Defect.created_at.asc())
            .limit(batch_size)
            .all()
        )

        for defect in oldest_defects:
            path = Path(defect.image_path)
            if path.exists():
                try:
                    size = path.stat().st_size
                    path.unlink()
                    freed += size
                    deleted += 1
                except Exception as exc:
                    logger.warning("[Cleanup] Purge failed for %s: %s", path, exc)
            defect.image_path = None

        logger.info(
            "[Cleanup] Purged %d excess failure images (count was %d, limit %d)",
            deleted, current_count, self.max_failure_images,
        )
        return {"deleted_files": deleted, "freed_bytes": freed}

    def _log_cleanup(self, db: Session, stats: dict) -> None:
        db.add(
            ActivityLog(
                username="system",
                role_name="system",
                action_type="CLEANUP",
                module="system",
                description=(
                    f"Hourly cleanup: {stats['deleted_files']} files deleted, "
                    f"{stats['freed_bytes'] / 1024:.1f} KB freed."
                ),
            )
        )

    async def scan_directory(self, directory: Path) -> dict:
        """Utility: scan a directory and report total size."""
        total_files = 0
        total_bytes = 0
        for root, _, files in os.walk(directory):
            for f in files:
                fp = Path(root) / f
                try:
                    total_bytes += fp.stat().st_size
                    total_files += 1
                except Exception:
                    pass
        return {"files": total_files, "bytes": total_bytes, "mb": round(total_bytes / (1024 * 1024), 2)}


cleanup_service = CleanupService()

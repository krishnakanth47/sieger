"""
IPS Inspection Service
Orchestrates CV pipeline, persists results, and updates live KPI counters.
"""
from __future__ import annotations

import asyncio
import logging
import random
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from backend.cv.pipeline import InspectionPipeline
from backend.database.db import SessionLocal
from backend.database.models import ActivityLog, Defect, InspectionResult
from backend.plc.modbus_client import plc_client

logger = logging.getLogger(__name__)


class KPICounters:
    """Thread-safe KPI counter set."""
    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self.total = 0
        self.accepted = 0
        self.defective = 0
        self.tube_pattern_status = 0
        self.cone_diameter_status = 0
        self.tube_diameter_status = 0
        self.stain_count = 0
        self.yarn_tail_faults = 0
        self.thread_mix_faults = 0
        self.session_start: Optional[datetime] = None

    def to_dict(self) -> dict:
        efficiency = (self.accepted / self.total * 100) if self.total > 0 else 0
        return {
            "total": self.total,
            "accepted": self.accepted,
            "defective": self.defective,
            "tube_pattern_status": self.tube_pattern_status,
            "cone_diameter_status": self.cone_diameter_status,
            "tube_diameter_status": self.tube_diameter_status,
            "stain_count": self.stain_count,
            "yarn_tail_faults": self.yarn_tail_faults,
            "thread_mix_faults": self.thread_mix_faults,
            "efficiency_pct": round(efficiency, 1),
            "session_start": self.session_start.isoformat() if self.session_start else None,
        }


class InspectionService:
    """
    Runs the real-time inspection loop.
    Processes one cone per cycle, persists to DB, and broadcasts updates.
    """

    def __init__(self) -> None:
        self._pipeline = InspectionPipeline()
        self._counters = KPICounters()
        self._running = False
        self._paused = False
        self._task: Optional[asyncio.Task] = None
        self._frame_callbacks: list = []
        self._kpi_callbacks: list = []
        self._cycle_interval = 0.5  # inspect every 500ms (mock)

    @property
    def kpi(self) -> KPICounters:
        return self._counters

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def is_paused(self) -> bool:
        return self._paused

    def add_frame_callback(self, cb) -> None:
        self._frame_callbacks.append(cb)

    def add_kpi_callback(self, cb) -> None:
        self._kpi_callbacks.append(cb)

    async def start(self, operator_id: Optional[int] = None) -> None:
        if self._running:
            return
        self._running = True
        self._paused = False
        self._counters.session_start = datetime.utcnow()
        self._task = asyncio.create_task(self._inspection_loop(operator_id), name="inspection_loop")
        logger.info("Inspection started.")

    async def stop(self) -> None:
        self._running = False
        self._paused = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Inspection stopped. Total: %d", self._counters.total)

    async def pause(self) -> None:
        self._paused = True
        logger.info("Inspection paused.")

    async def resume(self) -> None:
        self._paused = False
        logger.info("Inspection resumed.")

    def reset_counters(self) -> None:
        self._counters.reset()

    async def _inspection_loop(self, operator_id: Optional[int]) -> None:
        while self._running:
            if self._paused:
                await asyncio.sleep(0.1)
                continue
            try:
                await self._process_one_cone(operator_id)
                await asyncio.sleep(self._cycle_interval)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("Inspection loop error: %s", exc)
                await asyncio.sleep(1)

    async def _process_one_cone(self, operator_id: Optional[int]) -> None:
        result = self._pipeline.process_cone()
        plc = plc_client.state

        # Update KPI counters
        self._counters.total += 1
        if result["status"] == "PASS":
            self._counters.accepted += 1
        else:
            self._counters.defective += 1

        m = result["measurements"]
        if not m.get("pattern_matched"):
            self._counters.tube_pattern_status += 1
        if m.get("stain_detected"):
            self._counters.stain_count += 1
        if m.get("thread_mix_detected"):
            self._counters.thread_mix_faults += 1
        if not m.get("yarn_tail_present", True):
            self._counters.yarn_tail_faults += 1

        # Check diameter tolerances (mock)
        cone_d = m.get("cone_diameter_mm", 190.0)
        if abs(cone_d - 190.0) > 5.0:
            self._counters.cone_diameter_status += 1
        tube_d = m.get("tube_diameter_mm", 42.0)
        if abs(tube_d - 42.0) > 2.0:
            self._counters.tube_diameter_status += 1

        # Persist to DB (non-blocking)
        asyncio.create_task(self._persist_result(result, operator_id))

        # Broadcast frames
        frame_payload = {
            "type": "camera_frame",
            "frames": result["frames"],
            "measurements": result["measurements"],
            "status": result["status"],
            "defects": result["defects"],
            "plc": {
                "basket_id": plc.basket_id,
                "machine_id": plc.machine_id,
                "material_id": plc.material_id,
            },
        }
        kpi_payload = {"type": "kpi_update", **self._counters.to_dict()}

        for cb in self._frame_callbacks:
            await _safe_call(cb, frame_payload)
        for cb in self._kpi_callbacks:
            await _safe_call(cb, kpi_payload)

    async def _persist_result(self, result: dict, operator_id: Optional[int]) -> None:
        """Non-blocking DB write."""
        db: Session = SessionLocal()
        try:
            m = result["measurements"]
            record = InspectionResult(
                status=result["status"],
                cone_diameter_mm=m.get("cone_diameter_mm"),
                tube_diameter_mm=m.get("tube_diameter_mm"),
                pattern_matched=m.get("pattern_matched", False),
                stain_detected=m.get("stain_detected", False),
                thread_mix_detected=m.get("thread_mix_detected", False),
                yarn_tail_present=m.get("yarn_tail_present", True),
                yarn_tail_confidence=m.get("yarn_tail_confidence"),
                operator_id=operator_id,
            )
            db.add(record)
            db.flush()

            for d in result.get("defects", []):
                db.add(Defect(
                    inspection_id=record.id,
                    defect_type=d["type"],
                    confidence=d.get("confidence"),
                ))
            db.commit()
        except Exception as exc:
            logger.error("DB persist error: %s", exc)
            db.rollback()
        finally:
            db.close()


async def _safe_call(cb, payload: dict) -> None:
    try:
        if asyncio.iscoroutinefunction(cb):
            await cb(payload)
        else:
            cb(payload)
    except Exception as exc:
        logger.error("Callback error: %s", exc)


inspection_service = InspectionService()

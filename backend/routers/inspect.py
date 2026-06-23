"""
IPS Inspect Router
WebSocket streams for live camera frames and KPI updates.
REST endpoints for inspection control.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from backend.core.security import get_current_user, require_module_read
from backend.core.state_machine import SystemState, state_machine
from backend.database.db import get_db
from backend.database.models import ActivityLog
from backend.services.inspection_service import inspection_service

router = APIRouter(prefix="/inspect", tags=["inspect"])
logger = logging.getLogger(__name__)

# Active WebSocket connections
_ws_clients: set[WebSocket] = set()


async def _broadcast(payload: dict) -> None:
    """Send payload to all connected WebSocket clients."""
    dead = set()
    msg = json.dumps(payload)
    for ws in list(_ws_clients):
        try:
            await ws.send_text(msg)
        except Exception:
            dead.add(ws)
    for ws in dead:
        _ws_clients.discard(ws)


@router.websocket("/ws")
async def websocket_inspect(websocket: WebSocket):
    """Live inspection WebSocket — streams camera frames + KPI updates."""
    await websocket.accept()
    _ws_clients.add(websocket)
    logger.info("WebSocket client connected. Total: %d", len(_ws_clients))

    # Register callbacks so the inspection service pushes to this client
    async def send_frame(payload: dict):
        await _broadcast(payload)

    async def send_kpi(payload: dict):
        await _broadcast(payload)

    # Only register once (service already has callbacks if running)
    if send_frame not in inspection_service._frame_callbacks:
        inspection_service.add_frame_callback(send_frame)
    if send_kpi not in inspection_service._kpi_callbacks:
        inspection_service.add_kpi_callback(send_kpi)

    # Send current state immediately
    await websocket.send_text(json.dumps({
        "type": "state_update",
        **state_machine.to_dict(),
    }))
    await websocket.send_text(json.dumps({
        "type": "kpi_update",
        **inspection_service.kpi.to_dict(),
    }))

    try:
        while True:
            # Keep-alive: listen for client control messages
            data = await websocket.receive_text()
            msg = json.loads(data)
            cmd = msg.get("command")
            if cmd == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        _ws_clients.discard(websocket)
        logger.info("WebSocket client disconnected. Total: %d", len(_ws_clients))


@router.post("/start")
async def start_inspection(
    db: Session = Depends(get_db),
    current_user=Depends(require_module_read("inspect")),
):
    if state_machine.state == SystemState.INSPECTION_RUNNING:
        raise HTTPException(status_code=409, detail="Inspection already running.")
    await state_machine.transition(SystemState.INSPECTION_RUNNING)
    await inspection_service.start(operator_id=current_user.id)

    # Register broadcast callbacks
    if _broadcast not in inspection_service._frame_callbacks:
        inspection_service.add_frame_callback(_broadcast)
        inspection_service.add_kpi_callback(_broadcast)

    # Log activity
    db.add(ActivityLog(
        user_id=current_user.id, username=current_user.username,
        role_name=current_user.role.name, action_type="START_INSPECTION",
        module="inspect", description="Live inspection started.",
    ))
    db.commit()

    # Broadcast state change
    await _broadcast({"type": "state_update", **state_machine.to_dict()})
    return {"status": "started", "state": state_machine.state}


@router.post("/stop")
async def stop_inspection(
    db: Session = Depends(get_db),
    current_user=Depends(require_module_read("inspect")),
):
    if state_machine.state != SystemState.INSPECTION_RUNNING:
        raise HTTPException(status_code=409, detail="Inspection not running.")
    await inspection_service.stop()
    await state_machine.transition(SystemState.IDLE)

    db.add(ActivityLog(
        user_id=current_user.id, username=current_user.username,
        role_name=current_user.role.name, action_type="STOP_INSPECTION",
        module="inspect",
        description=f"Inspection stopped. Total cones: {inspection_service.kpi.total}",
    ))
    db.commit()

    await _broadcast({"type": "state_update", **state_machine.to_dict()})
    return {"status": "stopped", "kpi": inspection_service.kpi.to_dict()}


@router.post("/pause")
async def pause_inspection(current_user=Depends(require_module_read("inspect"))):
    await inspection_service.pause()
    return {"status": "paused"}


@router.post("/resume")
async def resume_inspection(current_user=Depends(require_module_read("inspect"))):
    await inspection_service.resume()
    return {"status": "resumed"}


@router.post("/reset")
async def reset_counters(
    db: Session = Depends(get_db),
    current_user=Depends(require_module_read("inspect")),
):
    inspection_service.reset_counters()
    db.add(ActivityLog(
        user_id=current_user.id, username=current_user.username,
        role_name=current_user.role.name, action_type="RESET_COUNTERS",
        module="inspect", description="KPI counters reset by operator.",
    ))
    db.commit()
    await _broadcast({"type": "kpi_update", **inspection_service.kpi.to_dict()})
    return {"status": "reset"}


@router.get("/kpi")
async def get_kpi():
    return inspection_service.kpi.to_dict()


@router.get("/status")
async def get_status():
    return {
        **state_machine.to_dict(),
        "is_running": inspection_service.is_running,
        "is_paused": inspection_service.is_paused,
        "kpi": inspection_service.kpi.to_dict(),
    }

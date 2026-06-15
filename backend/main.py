"""
IPS FastAPI Application Entry Point
Manages app lifecycle, background tasks, CORS, and PyWebView launch.
"""
from __future__ import annotations

import asyncio
import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

# Add project root to sys.path so 'backend.x' imports work when run directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.core.config import settings
from backend.database.init_db import init_db
from backend.plc.modbus_client import plc_client
from backend.routers import (
    activity_log,
    analytics,
    data_capture,
    inspect,
    reports,
    settings as settings_router,
    teaching,
    users,
)
from backend.services.cleanup_service import cleanup_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(settings.DATA_DIR / "ips.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    logger.info("=" * 60)
    logger.info("  SIEGER — Cone Inspection System (IPS) v%s", settings.APP_VERSION)
    logger.info("=" * 60)

    # Initialize database
    init_db()
    logger.info("Database initialized.")

    # Start PLC mock client
    await plc_client.start()
    logger.info("PLC client started.")

    # Schedule hourly image cleanup
    scheduler.add_job(
        cleanup_service.run,
        trigger="interval",
        hours=1,
        id="hourly_cleanup",
        name="Hourly Image Cleanup",
    )
    scheduler.start()
    logger.info("Cleanup scheduler started (runs every hour).")

    logger.info("IPS backend ready at http://%s:%d", settings.HOST, settings.PORT)

    yield  # ← Application runs here

    # Shutdown
    logger.info("Shutting down IPS backend...")
    scheduler.shutdown(wait=False)
    await plc_client.stop()
    logger.info("IPS backend shutdown complete.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Industrial Cone Inspection System — SIEGER",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["null"],  # null for PyWebView local files
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Global error handler ──────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s: %s", request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
    )


# ─── Health check ──────────────────────────────────────────────────────────

@app.get("/api/health", tags=["system"])
async def health():
    from backend.core.state_machine import state_machine
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "system_state": state_machine.state.value,
        "plc_connected": plc_client.state.connected,
    }


@app.get("/api/system/info", tags=["system"])
async def system_info():
    from backend.core.state_machine import state_machine
    from backend.services.inspection_service import inspection_service
    return {
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "state": state_machine.to_dict(),
        "plc": {
            "connected": plc_client.state.connected,
            "basket_id": plc_client.state.basket_id,
            "machine_id": plc_client.state.machine_id,
            "material_id": plc_client.state.material_id,
        },
        "inspection": {
            "running": inspection_service.is_running,
            "paused": inspection_service.is_paused,
            "kpi": inspection_service.kpi.to_dict(),
        },
    }


# ─── API Routers ────────────────────────────────────────────────────────────

API_PREFIX = "/api"
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(inspect.router, prefix=API_PREFIX)
app.include_router(data_capture.router, prefix=API_PREFIX)
app.include_router(teaching.router, prefix=API_PREFIX)
app.include_router(settings_router.router, prefix=API_PREFIX)
app.include_router(analytics.router, prefix=API_PREFIX)
app.include_router(reports.router, prefix=API_PREFIX)
app.include_router(activity_log.router, prefix=API_PREFIX)


# ─── Frontend static serving ────────────────────────────────────────────────

def _get_frontend_dist() -> Path:
    """
    Resolve the frontend dist directory.
    Works both in development and when bundled with PyInstaller.
    """
    if getattr(sys, "frozen", False):
        # Running as PyInstaller bundle
        base = Path(sys._MEIPASS)  # type: ignore[attr-defined]
    else:
        base = Path(__file__).parent.parent

    return base / "frontend" / "dist"


_frontend_dist = _get_frontend_dist()
if _frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(_frontend_dist), html=True), name="frontend")
    logger.info("Serving frontend from: %s", _frontend_dist)
else:
    @app.get("/", tags=["system"])
    async def root():
        return {
            "message": "IPS API running. Frontend not built yet.",
            "docs": "/api/docs",
            "frontend_dist": str(_frontend_dist),
        }


# ─── Entry point ────────────────────────────────────────────────────────────

def launch_pywebview():
    """Launch PyWebView desktop window."""
    try:
        import webview
        window = webview.create_window(
            title="SIEGER — Cone Inspection System",
            url=f"http://{settings.HOST}:{settings.PORT}",
            width=1600,
            height=900,
            min_size=(1280, 720),
            background_color="#0d1117",
            text_select=False,
        )
        webview.start(debug=settings.DEBUG)
    except ImportError:
        logger.warning("PyWebView not installed. Open http://%s:%d in your browser.", settings.HOST, settings.PORT)


def start_server():
    """Start the uvicorn server."""
    uvicorn.run(
        "backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        log_level="info" if not settings.DEBUG else "debug",
        reload=False,
    )


if __name__ == "__main__":
    import threading

    # Start uvicorn in a background thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    # Wait briefly for server to boot
    import time
    time.sleep(2)

    # Launch the desktop window
    launch_pywebview()

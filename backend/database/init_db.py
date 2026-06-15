"""
IPS Database Initializer
Creates all tables and seeds default data on first run.
"""
from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.core.security import hash_password
from backend.database.db import Base, SessionLocal, engine
from backend.database.models import (
    CameraConfiguration,
    IlluminationState,
    Machine,
    Material,
    Permission,
    PLCConfiguration,
    Role,
    Setting,
    Shift,
    ToleranceSettings,
    User,
)

logger = logging.getLogger(__name__)

ROLES = [
    {"name": "Administrator", "description": "Full system access"},
    {"name": "Manager", "description": "All ops + reports + user management"},
    {"name": "Supervisor", "description": "Inspection + reports + analytics"},
    {"name": "Operator", "description": "Inspection and data capture only"},
    {"name": "Maintenance", "description": "Settings and teaching access"},
]

# module -> (read, write, delete) per role
PERMISSIONS: dict[str, dict[str, tuple[bool, bool, bool]]] = {
    "Administrator": {
        "inspect": (True, True, True),
        "data_capture": (True, True, True),
        "teaching": (True, True, True),
        "settings": (True, True, True),
        "analytics": (True, True, False),
        "reports": (True, True, False),
        "activity_log": (True, False, False),
        "user_management": (True, True, True),
    },
    "Manager": {
        "inspect": (True, True, False),
        "data_capture": (True, True, False),
        "teaching": (True, True, False),
        "settings": (True, True, False),
        "analytics": (True, False, False),
        "reports": (True, True, False),
        "activity_log": (True, False, False),
        "user_management": (True, True, False),
    },
    "Supervisor": {
        "inspect": (True, True, False),
        "data_capture": (True, True, False),
        "teaching": (True, False, False),
        "settings": (False, False, False),
        "analytics": (True, False, False),
        "reports": (True, True, False),
        "activity_log": (True, False, False),
        "user_management": (False, False, False),
    },
    "Operator": {
        "inspect": (True, True, False),
        "data_capture": (True, True, False),
        "teaching": (False, False, False),
        "settings": (False, False, False),
        "analytics": (True, False, False),
        "reports": (True, False, False),
        "activity_log": (False, False, False),
        "user_management": (False, False, False),
    },
    "Maintenance": {
        "inspect": (True, False, False),
        "data_capture": (True, False, False),
        "teaching": (True, True, False),
        "settings": (True, True, False),
        "analytics": (True, False, False),
        "reports": (True, False, False),
        "activity_log": (True, False, False),
        "user_management": (False, False, False),
    },
}

DEFAULT_SHIFTS = [
    {"name": "Shift A", "start_time": "06:00:00", "end_time": "14:00:00"},
    {"name": "Shift B", "start_time": "14:00:00", "end_time": "22:00:00"},
    {"name": "Shift C", "start_time": "22:00:00", "end_time": "06:00:00"},
]

DEFAULT_CAMERAS = [
    {"camera_name": "visible", "ip_address": "192.168.1.101", "port": 554},
    {"camera_name": "uv", "ip_address": "192.168.1.102", "port": 554},
    {"camera_name": "yarn_tail", "ip_address": "192.168.1.103", "port": 554},
]

DEFAULT_SETTINGS = [
    {"key": "system_name", "value": "Cone Inspection System", "description": "Display name"},
    {"key": "facility_name", "value": "SIEGER Textile Plant", "description": "Factory name"},
    {"key": "inspection_sensitivity", "value": "0.85", "description": "CV confidence threshold"},
    {"key": "auto_start_on_boot", "value": "false", "description": "Auto-start inspection"},
    {"key": "retention_days", "value": "3", "description": "Image retention policy days"},
    {"key": "max_failure_images", "value": "1000", "description": "Max failure images before cleanup"},
]


def init_db() -> None:
    """Create tables and seed default data."""
    settings.ensure_dirs()
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        _seed_roles(db)
        _seed_permissions(db)
        _seed_admin_user(db)
        _seed_shifts(db)
        _seed_cameras(db)
        _seed_plc(db)
        _seed_machines(db)
        _seed_materials(db)
        _seed_settings(db)
        _seed_illumination(db)
        _seed_tolerance(db)
        db.commit()
        logger.info("Database initialization complete.")
    except Exception as exc:
        db.rollback()
        logger.error("Database seed failed: %s", exc)
        raise
    finally:
        db.close()


def _seed_roles(db: Session) -> None:
    for r in ROLES:
        if not db.query(Role).filter(Role.name == r["name"]).first():
            db.add(Role(**r))
    db.flush()


def _seed_permissions(db: Session) -> None:
    for role_name, modules in PERMISSIONS.items():
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            continue
        for module, (r, w, d) in modules.items():
            exists = (
                db.query(Permission)
                .filter(Permission.role_id == role.id, Permission.module == module)
                .first()
            )
            if not exists:
                db.add(Permission(role_id=role.id, module=module, can_read=r, can_write=w, can_delete=d))
    db.flush()


def _seed_admin_user(db: Session) -> None:
    if not db.query(User).filter(User.username == "admin").first():
        admin_role = db.query(Role).filter(Role.name == "Administrator").first()
        db.add(
            User(
                username="admin",
                full_name="System Administrator",
                email="admin@sieger.local",
                hashed_password=hash_password("Admin@1234"),
                role_id=admin_role.id,
                is_active=True,
                employee_id="EMP-001",
                department="IT",
            )
        )
        logger.info("Default admin user created (username: admin, password: Admin@1234)")
    db.flush()


def _seed_shifts(db: Session) -> None:
    for s in DEFAULT_SHIFTS:
        if not db.query(Shift).filter(Shift.name == s["name"]).first():
            db.add(Shift(**s))
    db.flush()


def _seed_cameras(db: Session) -> None:
    for c in DEFAULT_CAMERAS:
        if not db.query(CameraConfiguration).filter(CameraConfiguration.camera_name == c["camera_name"]).first():
            db.add(CameraConfiguration(**c))
    db.flush()


def _seed_plc(db: Session) -> None:
    if not db.query(PLCConfiguration).first():
        db.add(PLCConfiguration(
            host=settings.PLC_DEFAULT_HOST,
            port=settings.PLC_DEFAULT_PORT,
        ))
    db.flush()


def _seed_machines(db: Session) -> None:
    for i in range(1, 4):
        mid = f"M-{i:03d}"
        if not db.query(Machine).filter(Machine.machine_id == mid).first():
            db.add(Machine(machine_id=mid, name=f"Winding Machine {i}", location=f"Line {i}"))
    db.flush()


def _seed_materials(db: Session) -> None:
    materials = [
        {"material_id": "MAT-001", "name": "Cotton Yarn 20s", "color": "White", "grade": "A"},
        {"material_id": "MAT-002", "name": "Polyester 30D", "color": "Black", "grade": "B"},
        {"material_id": "MAT-003", "name": "Nylon Blend", "color": "Brown", "grade": "A"},
    ]
    for m in materials:
        if not db.query(Material).filter(Material.material_id == m["material_id"]).first():
            db.add(Material(**m))
    db.flush()


def _seed_settings(db: Session) -> None:
    for s in DEFAULT_SETTINGS:
        if not db.query(Setting).filter(Setting.key == s["key"]).first():
            db.add(Setting(**s))
    db.flush()


def _seed_illumination(db: Session) -> None:
    if not db.query(IlluminationState).first():
        db.add(IlluminationState())
    db.flush()


def _seed_tolerance(db: Session) -> None:
    if not db.query(ToleranceSettings).first():
        db.add(ToleranceSettings())
    db.flush()

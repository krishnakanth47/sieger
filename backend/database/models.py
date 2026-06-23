"""
IPS Database Models
Complete SQLAlchemy ORM schema for all 15 tables.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

def utc_now():
    return datetime.now(timezone.utc)

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from backend.database.db import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)  # Administrator, Manager, etc.
    description = Column(String(200))

    users = relationship("User", back_populates="role")
    permissions = relationship("Permission", back_populates="role", cascade="all, delete-orphan")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    module = Column(String(50), nullable=False)   # inspect, data_capture, teaching, etc.
    can_read = Column(Boolean, default=True)
    can_write = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)

    role = relationship("Role", back_populates="permissions")
    __table_args__ = (UniqueConstraint("role_id", "module", name="uq_role_module"),)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=True)
    hashed_password = Column(String(200), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    last_login = Column(DateTime, nullable=True)
    employee_id = Column(String(50), nullable=True)
    department = Column(String(100), nullable=True)

    role = relationship("Role", back_populates="users")
    activity_logs = relationship("ActivityLog", back_populates="user")
    services = relationship("UserService", back_populates="user", cascade="all, delete-orphan")


class UserService(Base):
    """Per-user service grants — independent of role-based permissions."""
    __tablename__ = "user_services"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    module = Column(String(50), nullable=False)  # inspect, data_capture, teaching, etc.

    user = relationship("User", back_populates="services")
    __table_args__ = (UniqueConstraint("user_id", "module", name="uq_user_module"),)


class Machine(Base):
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    location = Column(String(100))
    status = Column(String(20), default="offline")  # online, offline, maintenance
    last_seen = Column(DateTime, nullable=True)

    inspection_results = relationship("InspectionResult", back_populates="machine")


class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(50), nullable=True)
    grade = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    inspection_results = relationship("InspectionResult", back_populates="material")


class Pattern(Base):
    __tablename__ = "patterns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, onupdate=utc_now)
    image_count = Column(Integer, default=0)
    status = Column(String(20), default="staged")  # staged, active, archived
    thumbnail_path = Column(String(300), nullable=True)

    captured_images = relationship("CapturedImage", back_populates="pattern", cascade="all, delete-orphan")


class CapturedImage(Base):
    __tablename__ = "captured_images"

    id = Column(Integer, primary_key=True, index=True)
    pattern_id = Column(Integer, ForeignKey("patterns.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size_kb = Column(Float, nullable=True)
    captured_at = Column(DateTime, default=utc_now)
    is_staged = Column(Boolean, default=True)
    camera_source = Column(String(50), default="visible")  # visible, uv, yarn_tail

    pattern = relationship("Pattern", back_populates="captured_images")


class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    start_time = Column(String(8), nullable=False)   # "06:00:00"
    end_time = Column(String(8), nullable=False)     # "14:00:00"
    is_active = Column(Boolean, default=True)

    inspection_results = relationship("InspectionResult", back_populates="shift")


class InspectionResult(Base):
    __tablename__ = "inspection_results"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=True)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=True)
    basket_id = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=utc_now, index=True)
    status = Column(String(10), nullable=False)  # PASS, FAIL
    cone_diameter_mm = Column(Float, nullable=True)
    tube_diameter_mm = Column(Float, nullable=True)
    pattern_matched = Column(Boolean, default=False)
    stain_detected = Column(Boolean, default=False)
    thread_mix_detected = Column(Boolean, default=False)
    yarn_tail_present = Column(Boolean, default=False)
    yarn_tail_confidence = Column(Float, nullable=True)
    image_path = Column(String(500), nullable=True)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    machine = relationship("Machine", back_populates="inspection_results")
    material = relationship("Material", back_populates="inspection_results")
    shift = relationship("Shift", back_populates="inspection_results")
    defects = relationship("Defect", back_populates="inspection", cascade="all, delete-orphan")


class Defect(Base):
    __tablename__ = "defects"

    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspection_results.id", ondelete="CASCADE"), nullable=False)
    defect_type = Column(String(50), nullable=False)  # stain, thread_mix, diameter_fail, pattern_fail, yarn_tail
    confidence = Column(Float, nullable=True)
    bounding_box = Column(String(200), nullable=True)  # JSON: [x,y,w,h]
    image_path = Column(String(500), nullable=True)
    severity = Column(String(20), default="medium")   # low, medium, high, critical
    created_at = Column(DateTime, default=utc_now)

    inspection = relationship("InspectionResult", back_populates="defects")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=utc_now, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String(50), nullable=True)  # Denormalized for log integrity
    role_name = Column(String(50), nullable=True)
    ip_address = Column(String(50), nullable=True)
    action_type = Column(String(50), nullable=False)  # LOGIN, LOGOUT, PARAMETER_CHANGE, CREATE, DELETE, EXPORT
    module = Column(String(50), nullable=True)
    description = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True)  # JSON blob for extra context

    user = relationship("User", back_populates="activity_logs")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    report_type = Column(String(50), nullable=False)  # inspection, defect, production, shift, operator
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    generated_at = Column(DateTime, default=utc_now)
    filter_params = Column(Text, nullable=True)  # JSON
    file_path = Column(String(500), nullable=True)
    file_format = Column(String(10), nullable=True)  # csv, pdf, xlsx
    row_count = Column(Integer, nullable=True)


class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=True)
    description = Column(String(300), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)


class CameraConfiguration(Base):
    __tablename__ = "camera_configurations"

    id = Column(Integer, primary_key=True, index=True)
    camera_name = Column(String(50), unique=True, nullable=False)  # visible, uv, yarn_tail
    ip_address = Column(String(100), nullable=True)
    port = Column(Integer, default=554)
    username = Column(String(100), nullable=True)
    password = Column(String(200), nullable=True)
    stream_url = Column(String(300), nullable=True)
    is_active = Column(Boolean, default=False)
    last_connected = Column(DateTime, nullable=True)


class PLCConfiguration(Base):
    __tablename__ = "plc_configurations"

    id = Column(Integer, primary_key=True, index=True)
    host = Column(String(100), nullable=False)
    port = Column(Integer, default=502)
    unit_id = Column(Integer, default=1)
    basket_id_register = Column(Integer, default=1000)
    machine_id_register = Column(Integer, default=1001)
    material_id_register = Column(Integer, default=1002)
    is_active = Column(Boolean, default=False)
    last_connected = Column(DateTime, nullable=True)


class ToleranceSettings(Base):
    __tablename__ = "tolerance_settings"

    id = Column(Integer, primary_key=True, index=True)
    pattern_id = Column(Integer, ForeignKey("patterns.id"), nullable=True)
    required_cone_diameter_mm = Column(Float, default=190.0)
    cone_tolerance_mm = Column(Float, default=5.0)
    required_tube_diameter_mm = Column(Float, default=42.0)
    tube_tolerance_mm = Column(Float, default=2.0)
    enable_extraction = Column(Boolean, default=True)
    enable_tube_pattern = Column(Boolean, default=True)
    enable_stain_detection = Column(Boolean, default=True)
    enable_thread_mix_detection = Column(Boolean, default=True)
    roi_x = Column(Float, default=0.1)
    roi_y = Column(Float, default=0.1)
    roi_width = Column(Float, default=0.8)
    roi_height = Column(Float, default=0.8)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)


class IlluminationState(Base):
    __tablename__ = "illumination_states"

    id = Column(Integer, primary_key=True, index=True)
    master_enabled = Column(Boolean, default=False)
    visible_light = Column(Boolean, default=False)
    uv_light = Column(Boolean, default=False)
    yarn_tail_light = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

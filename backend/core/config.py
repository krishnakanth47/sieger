"""
IPS Core Configuration
Application-wide settings loaded from environment or defaults.
"""
from __future__ import annotations

import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent.parent  # project root


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Application
    APP_NAME: str = "Cone Inspection System (IPS)"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Server
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # Security
    SECRET_KEY: str = "SIEGER_IPS_SECRET_CHANGE_IN_PRODUCTION_2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8-hour shift

    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'data' / 'ips.db'}"

    # Image Storage
    DATA_DIR: Path = BASE_DIR / "data"
    CAPTURE_STAGING_DIR: Path = BASE_DIR / "data" / "capture_staging"
    INSPECTION_IMAGES_DIR: Path = BASE_DIR / "data" / "inspection_images"
    DEFECT_IMAGES_DIR: Path = BASE_DIR / "data" / "defect_images"

    # Retention Policy
    IMAGE_RETENTION_DAYS: int = 3
    MAX_FAILURE_IMAGES: int = 1000

    # Camera mock frame rate (fps simulation)
    MOCK_FRAME_INTERVAL_MS: int = 100  # 10 fps mock

    # Modbus TCP
    PLC_DEFAULT_HOST: str = "192.168.1.100"
    PLC_DEFAULT_PORT: int = 502

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"]

    def ensure_dirs(self) -> None:
        """Create all required runtime directories."""
        for d in [
            self.DATA_DIR,
            self.CAPTURE_STAGING_DIR,
            self.INSPECTION_IMAGES_DIR,
            self.DEFECT_IMAGES_DIR,
        ]:
            d.mkdir(parents=True, exist_ok=True)


settings = Settings()

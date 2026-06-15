"""
IPS Finite State Machine
Enforces industrial interlock rules for all system states.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from enum import Enum
from typing import Callable

logger = logging.getLogger(__name__)


class SystemState(str, Enum):
    IDLE = "IDLE"
    INSPECTION_RUNNING = "INSPECTION_RUNNING"
    DATA_CAPTURING = "DATA_CAPTURING"
    TEACHING = "TEACHING"
    MAINTENANCE = "MAINTENANCE"


# Modules locked per state
LOCKED_MODULES: dict[SystemState, set[str]] = {
    SystemState.INSPECTION_RUNNING: {
        "data_capture",
        "teaching",
        "settings",
        "pattern_management",
        "user_management",
    },
    SystemState.DATA_CAPTURING: {
        "inspect",
        "teaching",
        "settings",
    },
    SystemState.TEACHING: {
        "inspect",
        "data_capture",
        "settings",
    },
    SystemState.MAINTENANCE: {
        "inspect",
        "data_capture",
        "teaching",
    },
    SystemState.IDLE: set(),
}

ALWAYS_ACCESSIBLE: set[str] = {"analytics", "reports", "activity_log"}

# Valid state transitions
VALID_TRANSITIONS: dict[SystemState, set[SystemState]] = {
    SystemState.IDLE: {
        SystemState.INSPECTION_RUNNING,
        SystemState.DATA_CAPTURING,
        SystemState.TEACHING,
        SystemState.MAINTENANCE,
    },
    SystemState.INSPECTION_RUNNING: {SystemState.IDLE},
    SystemState.DATA_CAPTURING: {SystemState.IDLE},
    SystemState.TEACHING: {SystemState.IDLE},
    SystemState.MAINTENANCE: {SystemState.IDLE},
}


class StateMachine:
    """Thread-safe singleton state machine."""

    def __init__(self) -> None:
        self._state: SystemState = SystemState.IDLE
        self._lock = asyncio.Lock()
        self._changed_at: datetime = datetime.utcnow()
        self._listeners: list[Callable[[SystemState, SystemState], None]] = []

    @property
    def state(self) -> SystemState:
        return self._state

    @property
    def changed_at(self) -> datetime:
        return self._changed_at

    def register_listener(self, cb: Callable[[SystemState, SystemState], None]) -> None:
        self._listeners.append(cb)

    async def transition(self, new_state: SystemState) -> None:
        async with self._lock:
            if new_state not in VALID_TRANSITIONS.get(self._state, set()):
                raise ValueError(
                    f"Invalid transition: {self._state} → {new_state}"
                )
            old_state = self._state
            self._state = new_state
            self._changed_at = datetime.utcnow()
            logger.info("State transition: %s → %s", old_state, new_state)
            for cb in self._listeners:
                try:
                    cb(old_state, new_state)
                except Exception as exc:
                    logger.error("State listener error: %s", exc)

    def is_module_locked(self, module: str) -> bool:
        if module in ALWAYS_ACCESSIBLE:
            return False
        return module in LOCKED_MODULES.get(self._state, set())

    def get_locked_modules(self) -> list[str]:
        return sorted(LOCKED_MODULES.get(self._state, set()))

    def to_dict(self) -> dict:
        return {
            "state": self._state.value,
            "changed_at": self._changed_at.isoformat(),
            "locked_modules": self.get_locked_modules(),
        }


# Global singleton
state_machine = StateMachine()

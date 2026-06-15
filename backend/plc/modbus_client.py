"""
IPS Modbus TCP Mock Client
Asyncio listener mimicking a hardware PLC providing basket, machine, and material IDs.
Replace with real pymodbus implementation for production hardware.
"""
from __future__ import annotations

import asyncio
import logging
import random
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class PLCState:
    """Current PLC register snapshot."""
    basket_id: str = "BKT-000"
    machine_id: str = "M-001"
    material_id: str = "MAT-001"
    is_running: bool = False
    cycle_count: int = 0
    alarm_active: bool = False
    connected: bool = False
    last_update: Optional[float] = None


class ModbusMockClient:
    """
    Simulates a Modbus TCP PLC connection.
    Reads register blocks and updates PLCState at a configurable poll interval.

    In production, replace `_read_registers` with:
        from pymodbus.client import AsyncModbusTcpClient
        client = AsyncModbusTcpClient(host, port=port)
        await client.connect()
        rr = await client.read_holding_registers(address, count=3, slave=unit_id)
    """

    def __init__(
        self,
        host: str = "192.168.1.100",
        port: int = 502,
        unit_id: int = 1,
        poll_interval: float = 1.0,
    ) -> None:
        self.host = host
        self.port = port
        self.unit_id = unit_id
        self.poll_interval = poll_interval
        self._state = PLCState()
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._listeners: list = []

        # Mock basket counter for cycling through IDs
        self._basket_counter = 1
        self._material_ids = ["MAT-001", "MAT-002", "MAT-003"]
        self._machine_ids = ["M-001", "M-002", "M-003"]

    @property
    def state(self) -> PLCState:
        return self._state

    def add_listener(self, cb) -> None:
        self._listeners.append(cb)

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._poll_loop(), name="plc_poll")
        logger.info("PLC mock client started (host=%s, port=%d)", self.host, self.port)

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._state.connected = False
        logger.info("PLC mock client stopped.")

    async def _poll_loop(self) -> None:
        while self._running:
            try:
                await self._read_registers()
                await asyncio.sleep(self.poll_interval)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.warning("PLC poll error: %s", exc)
                self._state.connected = False
                await asyncio.sleep(self.poll_interval * 2)

    async def _read_registers(self) -> None:
        """
        Mock: Simulates register reads.
        Production: Replace with actual pymodbus client calls.
        """
        import time

        # Simulate connection success/failure (98% success rate)
        if random.random() > 0.02:
            self._state.connected = True
        else:
            self._state.connected = False
            logger.debug("PLC simulated connection drop")
            return

        # Simulate cycle: new basket every ~30 polls
        if random.random() < 0.033:
            self._basket_counter += 1
            self._state.basket_id = f"BKT-{self._basket_counter:04d}"
            self._state.material_id = random.choice(self._material_ids)
            self._state.machine_id = random.choice(self._machine_ids)
            logger.debug("PLC: New basket %s", self._state.basket_id)

        self._state.cycle_count += 1
        self._state.is_running = True
        self._state.alarm_active = random.random() < 0.01  # 1% alarm chance
        self._state.last_update = time.time()

        # Notify listeners
        snapshot = {
            "basket_id": self._state.basket_id,
            "machine_id": self._state.machine_id,
            "material_id": self._state.material_id,
            "is_running": self._state.is_running,
            "cycle_count": self._state.cycle_count,
            "alarm_active": self._state.alarm_active,
            "connected": self._state.connected,
        }
        for cb in self._listeners:
            try:
                if asyncio.iscoroutinefunction(cb):
                    await cb(snapshot)
                else:
                    cb(snapshot)
            except Exception as exc:
                logger.error("PLC listener error: %s", exc)


# Global singleton PLC client
plc_client = ModbusMockClient()

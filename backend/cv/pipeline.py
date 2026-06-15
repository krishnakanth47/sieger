"""
IPS Computer Vision Pipeline
Mock CV pipeline generating realistic inspection overlays.
In production, replace mock generators with real YOLOv8/OpenCV implementations.
"""
from __future__ import annotations

import base64
import io
import math
import random
import time
from dataclasses import dataclass, field
from typing import Optional

import numpy as np

try:
    import cv2
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False


@dataclass
class BoundingBox:
    x: int
    y: int
    w: int
    h: int
    label: str
    confidence: float
    color: tuple[int, int, int] = field(default=(0, 255, 0))


@dataclass
class CameraFrame:
    camera_id: str          # visible | uv | yarn_tail
    frame_b64: str          # base64 JPEG
    timestamp: float
    bounding_boxes: list[BoundingBox]
    overlays: list[dict]    # text overlays [{text, x, y, color}]
    defect_detected: bool
    confidence_score: float
    measurements: dict


class VisibleCameraProcessor:
    """
    Simulates a visible-light camera detecting cone body, tube, stain, and pattern.
    Produces JPEG frames with OpenCV-rendered bounding boxes.
    """

    def __init__(self) -> None:
        self._frame_count = 0
        self._cone_diameter = 190.0
        self._tube_diameter = 42.0
        self._defect_probability = 0.08  # 8% defect rate

    def generate_frame(self) -> CameraFrame:
        self._frame_count += 1
        t = time.time()

        # Create dark industrial background
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        frame[:] = (18, 20, 22)

        # Draw simulated cone body (ellipse)
        cx, cy = 320, 240
        cv2.ellipse(frame, (cx, cy), (160, 180), 0, 0, 360, (60, 80, 100), -1)
        cv2.ellipse(frame, (cx, cy), (160, 180), 0, 0, 360, (80, 110, 140), 3)

        # Draw inner tube
        cv2.circle(frame, (cx, cy), 40, (30, 35, 45), -1)
        cv2.circle(frame, (cx, cy), 40, (100, 130, 160), 2)

        # Simulate yarn wrapping texture
        for i in range(0, 360, 12):
            angle = math.radians(i + self._frame_count * 2)
            x1 = int(cx + 80 * math.cos(angle))
            y1 = int(cy + 90 * math.sin(angle))
            x2 = int(cx + 155 * math.cos(angle))
            y2 = int(cy + 170 * math.sin(angle))
            cv2.line(frame, (x1, y1), (x2, y2), (70, 90, 110), 1)

        # Add noise texture
        noise = np.random.randint(0, 20, frame.shape, dtype=np.uint8)
        frame = cv2.add(frame, noise)

        defect_detected = random.random() < self._defect_probability
        stain_detected = defect_detected and random.random() < 0.5

        # Draw stain if detected
        if stain_detected:
            sx, sy = cx + random.randint(-80, 80), cy + random.randint(-80, 80)
            cv2.ellipse(frame, (sx, sy), (15, 10), random.randint(0, 90), 0, 360, (0, 0, 180), -1)

        # Bounding boxes
        boxes: list[BoundingBox] = [
            BoundingBox(120, 45, 400, 395, "bobbin", 0.99, (0, 255, 100)),
            BoundingBox(280, 200, 80, 80, "tube", 0.97, (0, 200, 255)),
        ]

        # Diameter with tolerance variance
        cone_diam = self._cone_diameter + random.gauss(0, 1.5)
        tube_diam = self._tube_diameter + random.gauss(0, 0.8)

        overlays = [
            {"text": f"[bobbin {boxes[0].confidence:.2f}]", "x": 122, "y": 40, "color": (0, 255, 100)},
            {"text": f"[TUBE DIMENSION: {tube_diam:.2f} mm]", "x": 10, "y": 460, "color": (0, 200, 255)},
            {"text": "[PATTERN MATCHED]" if not defect_detected else "[PATTERN MISMATCH]",
             "x": 10, "y": 20, "color": (0, 255, 0) if not defect_detected else (0, 0, 255)},
        ]

        # Render bounding boxes and overlays
        for box in boxes:
            color = box.color if not defect_detected else (0, 0, 255)
            cv2.rectangle(frame, (box.x, box.y), (box.x + box.w, box.y + box.h), color, 2)
            cv2.putText(frame, f"{box.label} {box.confidence:.2f}",
                       (box.x, box.y - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 1, cv2.LINE_AA)

        for ov in overlays:
            cv2.putText(frame, ov["text"], (ov["x"], ov["y"]),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, ov["color"], 1, cv2.LINE_AA)

        # Encode to JPEG
        _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        frame_b64 = base64.b64encode(buf.tobytes()).decode()

        return CameraFrame(
            camera_id="visible",
            frame_b64=frame_b64,
            timestamp=t,
            bounding_boxes=boxes,
            overlays=overlays,
            defect_detected=defect_detected,
            confidence_score=random.uniform(0.92, 0.99),
            measurements={
                "cone_diameter_mm": round(cone_diam, 2),
                "tube_diameter_mm": round(tube_diam, 2),
                "pattern_matched": not defect_detected,
                "stain_detected": stain_detected,
            },
        )


class UVCameraProcessor:
    """Simulates a UV camera detecting thread mix and contamination."""

    def __init__(self) -> None:
        self._defect_probability = 0.05

    def generate_frame(self) -> CameraFrame:
        t = time.time()
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        frame[:] = (5, 5, 15)

        # UV glow effect on cone
        cx, cy = 320, 240
        for r in range(180, 100, -20):
            alpha = max(0, (180 - r) / 180)
            color = (int(80 * alpha), int(20 * alpha), int(200 * alpha))
            cv2.circle(frame, (cx, cy), r, color, 2)

        cv2.ellipse(frame, (cx, cy), (155, 175), 0, 0, 360, (30, 10, 120), -1)
        cv2.ellipse(frame, (cx, cy), (155, 175), 0, 0, 360, (100, 40, 255), 2)

        defect = random.random() < self._defect_probability
        if defect:
            # Draw UV anomaly highlight
            ax, ay = cx + random.randint(-60, 60), cy + random.randint(-60, 60)
            cv2.circle(frame, (ax, ay), random.randint(15, 35), (0, 0, 255), -1)
            cv2.putText(frame, "[DEFECT / THREAD MIX]", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2, cv2.LINE_AA)
        else:
            cv2.putText(frame, "[UV: CLEAN]", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (80, 255, 80), 2, cv2.LINE_AA)

        # UV scan lines effect
        for y in range(0, 480, 8):
            cv2.line(frame, (0, y), (640, y), (20, 5, 60), 1)

        _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        frame_b64 = base64.b64encode(buf.tobytes()).decode()

        return CameraFrame(
            camera_id="uv",
            frame_b64=frame_b64,
            timestamp=t,
            bounding_boxes=[],
            overlays=[],
            defect_detected=defect,
            confidence_score=random.uniform(0.90, 0.99),
            measurements={"thread_mix_detected": defect, "uv_intensity": round(random.uniform(0.7, 1.0), 3)},
        )


class YarnTailCameraProcessor:
    """Simulates a yarn tail camera detecting tail presence and alignment."""

    def __init__(self) -> None:
        self._tail_probability = 0.85  # 85% chance tail is present

    def generate_frame(self) -> CameraFrame:
        t = time.time()
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        frame[:] = (12, 12, 18)

        cx, cy = 320, 240
        cv2.circle(frame, (cx, cy), 120, (40, 50, 60), -1)
        cv2.circle(frame, (cx, cy), 120, (80, 100, 120), 2)

        tail_present = random.random() < self._tail_probability
        tail_confidence = random.uniform(0.45, 0.95) if tail_present else random.uniform(0.05, 0.35)

        if tail_present:
            # Draw yarn tail as a wavy line
            pts = []
            for i in range(20):
                tx = cx + 120 + i * 8
                ty = cy + int(15 * math.sin(i * 0.8 + t))
                pts.append((tx, ty))
            for i in range(len(pts) - 1):
                cv2.line(frame, pts[i], pts[i + 1], (180, 200, 220), 2)

        # Measurement crosshair
        cv2.line(frame, (cx - 130, cy), (cx + 130, cy), (60, 60, 60), 1)
        cv2.line(frame, (cx, cy - 130), (cx, cy + 130), (60, 60, 60), 1)

        status_color = (0, 255, 100) if tail_present else (0, 60, 255)
        cv2.putText(frame, f"[yarn-tail-present: {int(tail_confidence*100)}%]", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 2, cv2.LINE_AA)
        cv2.putText(frame, f"STATUS: {'DETECTED' if tail_present else 'MISSING'}", (10, 460),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 2, cv2.LINE_AA)

        _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        frame_b64 = base64.b64encode(buf.tobytes()).decode()

        return CameraFrame(
            camera_id="yarn_tail",
            frame_b64=frame_b64,
            timestamp=t,
            bounding_boxes=[],
            overlays=[],
            defect_detected=not tail_present,
            confidence_score=tail_confidence,
            measurements={
                "yarn_tail_present": tail_present,
                "yarn_tail_confidence": round(tail_confidence, 3),
            },
        )


class InspectionPipeline:
    """Orchestrates all three camera processors."""

    def __init__(self) -> None:
        self.visible = VisibleCameraProcessor()
        self.uv = UVCameraProcessor()
        self.yarn_tail = YarnTailCameraProcessor()

    def process_cone(self) -> dict:
        """Run all cameras and return combined inspection result."""
        vis = self.visible.generate_frame()
        uv = self.uv.generate_frame()
        yt = self.yarn_tail.generate_frame()

        any_defect = vis.defect_detected or uv.defect_detected or yt.defect_detected
        status = "FAIL" if any_defect else "PASS"

        return {
            "status": status,
            "frames": {
                "visible": vis.frame_b64,
                "uv": uv.frame_b64,
                "yarn_tail": yt.frame_b64,
            },
            "measurements": {
                **vis.measurements,
                **uv.measurements,
                **yt.measurements,
            },
            "defects": _collect_defects(vis, uv, yt),
        }


def _collect_defects(vis: CameraFrame, uv: CameraFrame, yt: CameraFrame) -> list[dict]:
    defects = []
    if vis.measurements.get("stain_detected"):
        defects.append({"type": "stain", "confidence": vis.confidence_score, "camera": "visible"})
    if not vis.measurements.get("pattern_matched"):
        defects.append({"type": "pattern_fail", "confidence": vis.confidence_score, "camera": "visible"})
    if uv.measurements.get("thread_mix_detected"):
        defects.append({"type": "thread_mix", "confidence": uv.confidence_score, "camera": "uv"})
    if not yt.measurements.get("yarn_tail_present"):
        defects.append({"type": "yarn_tail_missing", "confidence": yt.confidence_score, "camera": "yarn_tail"})
    return defects


# Fallback pure-Python mock when OpenCV is not installed
class _FallbackProcessor:
    def generate_frame(self) -> CameraFrame:
        mock_jpeg = base64.b64encode(b"\xff\xd8\xff\xe0" + b"\x00" * 100).decode()
        return CameraFrame(
            camera_id="mock",
            frame_b64=mock_jpeg,
            timestamp=time.time(),
            bounding_boxes=[],
            overlays=[],
            defect_detected=False,
            confidence_score=0.95,
            measurements={},
        )


if not OPENCV_AVAILABLE:
    VisibleCameraProcessor = _FallbackProcessor  # type: ignore
    UVCameraProcessor = _FallbackProcessor        # type: ignore
    YarnTailCameraProcessor = _FallbackProcessor  # type: ignore

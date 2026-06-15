# SIEGER — Cone Inspection System (IPS)

> Production-grade Industrial AI Vision Platform for Textile Yarn Cone Quality Inspection

---

## Quick Start (Development)

### 1. Backend Setup

```bash
# Create Python virtual environment
python -m venv venv
venv\Scripts\activate       # Windows

# Install dependencies
pip install -r requirements.txt

# Run the FastAPI backend
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

The API will be available at `http://127.0.0.1:8000`  
Interactive docs: `http://127.0.0.1:8000/api/docs`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

### 3. Default Login

| Username | Password   | Role          |
|----------|------------|---------------|
| admin    | Admin@1234 | Administrator |

---

## Production Build

### Step 1: Build the frontend

```bash
cd frontend
npm run build
cd ..
```

### Step 2: Package with PyInstaller

```bash
venv\Scripts\activate
pyinstaller build.spec
```

The packaged application will be in `dist\SIEGER_IPS\SIEGER_IPS.exe`

---

## Project Structure

```
siger/
├── backend/
│   ├── core/
│   │   ├── config.py          # App settings (Pydantic)
│   │   ├── security.py        # JWT auth + bcrypt
│   │   └── state_machine.py   # Finite state machine
│   ├── database/
│   │   ├── db.py              # SQLAlchemy engine
│   │   ├── models.py          # ORM models (15 tables)
│   │   └── init_db.py         # DB initializer + seeder
│   ├── routers/
│   │   ├── inspect.py         # WebSocket + inspection control
│   │   ├── data_capture.py    # Pattern management
│   │   ├── teaching.py        # Tolerance + ROI config
│   │   ├── settings.py        # Camera, PLC, shifts, lights
│   │   ├── analytics.py       # Production metrics
│   │   ├── reports.py         # CSV/PDF export
│   │   ├── activity_log.py    # Audit trail
│   │   └── users.py           # Auth + RBAC
│   ├── services/
│   │   ├── inspection_service.py  # CV orchestrator + KPI
│   │   ├── cleanup_service.py     # Hourly image retention
│   │   └── report_service.py      # Pandas CSV/PDF
│   ├── cv/
│   │   └── pipeline.py        # Mock OpenCV camera processors
│   ├── plc/
│   │   └── modbus_client.py   # Modbus TCP asyncio mock
│   └── main.py                # FastAPI app + PyWebView launcher
├── frontend/
│   └── src/
│       ├── views/             # 8 full module views
│       ├── components/        # Layout, sidebar, header
│       ├── store/             # Zustand state management
│       ├── api/               # Axios client + API functions
│       ├── hooks/             # WebSocket hook
│       └── types/             # TypeScript interfaces
├── data/                      # Runtime DB + images (gitignored)
├── requirements.txt
├── build.spec                 # PyInstaller config
└── README.md
```

---

## System Architecture

```
                ┌─────────────────────────┐
                │   PyWebView Window      │
                │   (Desktop Container)   │
                └────────────┬────────────┘
                             │ HTTP + WebSocket
                ┌────────────▼────────────┐
                │   FastAPI Backend       │
                │   localhost:8000        │
                │                         │
                │  ┌─────────────────┐   │
                │  │  State Machine  │   │
                │  │ (IDLE/RUNNING…) │   │
                │  └─────────────────┘   │
                │  ┌─────────────────┐   │
                │  │  CV Pipeline    │   │
                │  │  (3x cameras)   │   │
                │  └─────────────────┘   │
                │  ┌─────────────────┐   │
                │  │  PLC/Modbus     │   │
                │  │  Mock Client    │   │
                │  └─────────────────┘   │
                │  ┌─────────────────┐   │
                │  │  SQLite DB      │   │
                │  │  (15 tables)    │   │
                │  └─────────────────┘   │
                │  ┌─────────────────┐   │
                │  │  APScheduler    │   │
                │  │  Hourly Cleanup │   │
                │  └─────────────────┘   │
                └─────────────────────────┘
```

---

## Security

- JWT access tokens (8-hour expiry, matching shift duration)
- bcrypt password hashing
- Role-Based Access Control (5 roles: Admin, Manager, Supervisor, Operator, Maintenance)
- Complete audit trail for all operations
- State machine interlocking prevents configuration changes during production

---

## Industrial Safety Interlocks

| System State        | Locked Modules                                          |
|---------------------|---------------------------------------------------------|
| INSPECTION_RUNNING  | Data Capture, Teaching, Settings, User Management      |
| DATA_CAPTURING      | Inspect, Teaching, Settings                             |
| TEACHING            | Inspect, Data Capture, Settings                         |
| MAINTENANCE         | Inspect, Data Capture, Teaching                         |
| IDLE                | None (all accessible)                                   |

Always accessible: Analytics, Reports, Activity Log

---

## Image Retention Policy

The system runs an hourly cleanup job that:
1. Deletes raw inspection images older than **3 days**
2. Purges the oldest 200 failure images when total count exceeds **1,000**
3. Never deletes database records — only filesystem files
4. Logs every cleanup event to the Activity Log

---

## API Documentation

When running in development, full OpenAPI docs are available at:
- Swagger UI: `http://localhost:8000/api/docs`
- ReDoc: `http://localhost:8000/api/redoc`

# -*- mode: python ; coding: utf-8 -*-
# IPS PyInstaller Build Specification
# Usage: pyinstaller build.spec

import sys
from pathlib import Path

block_cipher = None

# Collect all data files
datas = [
    # Frontend built assets (npm run build first)
    ('frontend/dist', 'frontend/dist'),
    # Data directory placeholder
    ('data/.gitkeep', 'data'),
]

# Hidden imports needed by FastAPI ecosystem
hidden_imports = [
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'sqlalchemy.dialects.sqlite',
    'apscheduler.schedulers.asyncio',
    'apscheduler.triggers.interval',
    'cv2',
    'numpy',
    'pandas',
    'jose',
    'bcrypt',
    'webview',
    'reportlab',
    'pymodbus',
]

a = Analysis(
    ['backend/main.py'],
    pathex=['.'],
    binaries=[],
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'test', 'unittest'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='SIEGER_IPS',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,      # No console window (industrial deployment)
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,          # Add icon path here: 'assets/icon.ico'
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='SIEGER_IPS',
)

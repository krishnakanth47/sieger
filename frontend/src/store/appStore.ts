import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AuthToken,
  CameraFramePayload,
  KPICounters,
  PLCState,
  SystemState,
} from '../types';

interface AppState {
  // Auth
  auth: AuthToken | null;
  setAuth: (auth: AuthToken | null) => void;
  isAuthenticated: () => boolean;
  hasPermission: (module: string, action: 'read' | 'write' | 'delete') => boolean;

  // System state
  systemState: SystemState;
  lockedModules: string[];
  setSystemState: (state: SystemState, locked: string[]) => void;
  isModuleLocked: (module: string) => boolean;

  // Live inspection data
  kpi: KPICounters;
  setKpi: (kpi: Partial<KPICounters>) => void;
  resetKpi: () => void;

  // Camera frames
  frames: CameraFramePayload['frames'];
  lastFrameStatus: 'PASS' | 'FAIL' | null;
  lastDefects: CameraFramePayload['defects'];
  lastMeasurements: Record<string, number | boolean>;
  setFrame: (payload: CameraFramePayload) => void;

  // PLC
  plc: PLCState;
  setPLC: (plc: Partial<PLCState>) => void;

  // UI
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  alertMessage: string | null;
  showAlert: (msg: string) => void;
  clearAlert: () => void;

  // Active view
  activeView: string;
  setActiveView: (view: string) => void;
}

const defaultKpi: KPICounters = {
  total: 0,
  accepted: 0,
  defective: 0,
  tube_pattern_status: 0,
  cone_diameter_status: 0,
  tube_diameter_status: 0,
  stain_count: 0,
  yarn_tail_faults: 0,
  thread_mix_faults: 0,
  efficiency_pct: 0,
  session_start: null,
};

const ALWAYS_ACCESSIBLE = new Set(['analytics', 'reports', 'activity_log']);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ─── Auth ─────────────────────────────────────────────
      auth: null,
      setAuth: (auth) => set({ auth }),
      isAuthenticated: () => !!get().auth,
      hasPermission: (module, action) => {
        const perms = get().auth?.permissions;
        if (!perms) return false;
        const p = perms[module];
        if (!p) return false;
        return p[action] === true;
      },

      // ─── System State ──────────────────────────────────────
      systemState: 'IDLE',
      lockedModules: [],
      setSystemState: (state, locked) =>
        set({ systemState: state, lockedModules: locked }),
      isModuleLocked: (module) => {
        if (ALWAYS_ACCESSIBLE.has(module)) return false;
        return get().lockedModules.includes(module);
      },

      // ─── KPI ───────────────────────────────────────────────
      kpi: defaultKpi,
      setKpi: (partial) => set((s) => ({ kpi: { ...s.kpi, ...partial } })),
      resetKpi: () => set({ kpi: defaultKpi }),

      // ─── Frames ────────────────────────────────────────────
      frames: { visible: '', uv: '', yarn_tail: '' },
      lastFrameStatus: null,
      lastDefects: [],
      lastMeasurements: {},
      setFrame: (payload) =>
        set({
          frames: payload.frames,
          lastFrameStatus: payload.status,
          lastDefects: payload.defects,
          lastMeasurements: payload.measurements,
        }),

      // ─── PLC ───────────────────────────────────────────────
      plc: { basket_id: '—', machine_id: '—', material_id: '—', connected: false },
      setPLC: (partial) => set((s) => ({ plc: { ...s.plc, ...partial } })),

      // ─── UI ────────────────────────────────────────────────
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      alertMessage: null,
      showAlert: (msg) => set({ alertMessage: msg }),
      clearAlert: () => set({ alertMessage: null }),

      // ─── Navigation ────────────────────────────────────────
      activeView: 'inspect',
      setActiveView: (view) => set({ activeView: view }),
    }),
    {
      name: 'ips-app-store',
      partialize: (state) => ({ auth: state.auth, activeView: state.activeView }),
    }
  )
);

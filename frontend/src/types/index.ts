// IPS TypeScript Type Definitions

export type SystemState =
  | 'IDLE'
  | 'INSPECTION_RUNNING'
  | 'DATA_CAPTURING'
  | 'TEACHING'
  | 'MAINTENANCE';

export interface StateMachineInfo {
  state: SystemState;
  changed_at: string;
  locked_modules: string[];
}

export interface KPICounters {
  total: number;
  accepted: number;
  defective: number;
  tube_pattern_status: number;
  cone_diameter_status: number;
  tube_diameter_status: number;
  stain_count: number;
  yarn_tail_faults: number;
  thread_mix_faults: number;
  efficiency_pct: number;
  session_start: string | null;
}

export interface CameraFramePayload {
  type: 'camera_frame';
  frames: {
    visible: string;
    uv: string;
    yarn_tail: string;
  };
  measurements: Record<string, number | boolean>;
  status: 'PASS' | 'FAIL';
  defects: Array<{ type: string; confidence: number; camera: string }>;
  plc: {
    basket_id: string;
    machine_id: string;
    material_id: string;
  };
}

export interface PLCState {
  basket_id: string;
  machine_id: string;
  material_id: string;
  connected: boolean;
}

export interface User {
  id: number;
  username: string;
  full_name: string;
  email: string | null;
  role: string;
  is_active: boolean;
  employee_id: string | null;
  department: string | null;
  last_login: string | null;
  created_at: string | null;
  services: string[];
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions?: Record<string, { read: boolean; write: boolean; delete: boolean }>;
}

export interface Permission {
  module: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
}

export interface Pattern {
  id: number;
  name: string;
  description: string;
  image_count: number;
  status: string;
  created_at: string | null;
  ready: boolean;
}

export interface Shift {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface CameraConfig {
  id: number;
  camera_name: string;
  ip_address: string | null;
  port: number;
  stream_url: string | null;
  is_active: boolean;
  last_connected: string | null;
}

export interface PLCConfig {
  id: number;
  host: string;
  port: number;
  unit_id: number;
  basket_id_register: number;
  machine_id_register: number;
  material_id_register: number;
  is_active: boolean;
}

export interface ToleranceSettings {
  pattern_id: number | null;
  required_cone_diameter_mm: number;
  cone_tolerance_mm: number;
  required_tube_diameter_mm: number;
  tube_tolerance_mm: number;
  enable_extraction: boolean;
  enable_tube_pattern: boolean;
  enable_stain_detection: boolean;
  enable_thread_mix_detection: boolean;
  roi: { x: number; y: number; width: number; height: number };
}

export interface IlluminationState {
  master_enabled: boolean;
  visible_light: boolean;
  uv_light: boolean;
  yarn_tail_light: boolean;
}

export interface ActivityLogEntry {
  id: number;
  timestamp: string;
  user_id: number | null;
  username: string | null;
  role_name: string | null;
  ip_address: string | null;
  action_type: string;
  module: string | null;
  description: string;
}

export interface InspectionRecord {
  id: number;
  timestamp: string;
  status: 'PASS' | 'FAIL';
  cone_diameter_mm: number | null;
  tube_diameter_mm: number | null;
  pattern_matched: boolean;
  stain_detected: boolean;
  thread_mix_detected: boolean;
  yarn_tail_present: boolean;
  basket_id: string | null;
  machine_id: number | null;
  shift_id: number | null;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user_id: number;
  username: string;
  full_name: string;
  role: string;
  permissions: Record<string, { read: boolean; write: boolean; delete: boolean }>;
}

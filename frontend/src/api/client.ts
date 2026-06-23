import axios from 'axios';

const API_BASE = '/api';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('ips_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
client.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ips_token');
      localStorage.removeItem('ips_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;

// ─── Auth ──────────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    client.post('/users/login', { username, password }),
  logout: () => client.post('/users/logout'),
  me: () => client.get('/users/me'),
};

// ─── Inspect ───────────────────────────────────────────────
export const inspectApi = {
  start: () => client.post('/inspect/start'),
  stop: () => client.post('/inspect/stop'),
  pause: () => client.post('/inspect/pause'),
  resume: () => client.post('/inspect/resume'),
  reset: () => client.post('/inspect/reset'),
  kpi: () => client.get('/inspect/kpi'),
  status: () => client.get('/inspect/status'),
};

// ─── Data Capture ──────────────────────────────────────────
export const captureApi = {
  listPatterns: () => client.get('/data-capture/patterns'),
  createPattern: (name: string, description?: string) =>
    client.post('/data-capture/patterns', { name, description }),
  captureImage: (patternId: number) =>
    client.post(`/data-capture/capture-image?pattern_id=${patternId}`),
  renamePattern: (id: number, newName: string) =>
    client.patch(`/data-capture/patterns/${id}/rename`, { new_name: newName }),
  deletePattern: (id: number) =>
    client.delete(`/data-capture/patterns/${id}`),
  clearStaging: (id: number) =>
    client.post(`/data-capture/patterns/${id}/clear-staging`),
  stagingStats: () => client.get('/data-capture/staging-stats'),
};

// ─── Teaching ──────────────────────────────────────────────
export const teachingApi = {
  getTolerance: (patternId?: number) =>
    client.get('/teaching/tolerance', { params: { pattern_id: patternId } }),
  updateTolerance: (data: object) =>
    client.put('/teaching/tolerance', data),
  getPatterns: () => client.get('/teaching/patterns'),
};

// ─── Settings ──────────────────────────────────────────────
export const settingsApi = {
  getCameras: () => client.get('/settings/cameras'),
  updateCamera: (name: string, data: object) =>
    client.put(`/settings/cameras/${name}`, data),
  getPLC: () => client.get('/settings/plc'),
  updatePLC: (data: object) => client.put('/settings/plc', data),
  getShifts: () => client.get('/settings/shifts'),
  createShift: (data: object) => client.post('/settings/shifts', data),
  updateShift: (id: number, data: object) =>
    client.put(`/settings/shifts/${id}`, data),
  deleteShift: (id: number) => client.delete(`/settings/shifts/${id}`),
  getIllumination: () => client.get('/settings/illumination'),
  updateIllumination: (data: object) =>
    client.patch('/settings/illumination', data),
  getGeneral: () => client.get('/settings/general'),
  updateSetting: (key: string, value: string) =>
    client.put(`/settings/general/${key}?value=${encodeURIComponent(value)}`),
};

// ─── Analytics ─────────────────────────────────────────────
export const analyticsApi = {
  summary: () => client.get('/analytics/summary'),
  hourly: (date?: string) =>
    client.get('/analytics/hourly', { params: { date } }),
  shifts: () => client.get('/analytics/shifts'),
  defectTrends: (days?: number) =>
    client.get('/analytics/defect-trends', { params: { days } }),
  kpiCards: () => client.get('/analytics/kpi-cards'),
};

// ─── Reports ───────────────────────────────────────────────
export const reportsApi = {
  getData: (params: object) => client.get('/reports/', { params }),
  exportCSV: (params: object) =>
    client.post('/reports/export/csv', null, { params, responseType: 'blob' }),
  exportPDF: (params: object) =>
    client.post('/reports/export/pdf', null, { params, responseType: 'blob' }),
  history: () => client.get('/reports/history'),
};

// ─── Activity Log ──────────────────────────────────────────
export const activityApi = {
  getLogs: (params: object) => client.get('/activity-log/', { params }),
  getStats: () => client.get('/activity-log/stats'),
  getActionTypes: () => client.get('/activity-log/action-types'),
};

// ─── Users ─────────────────────────────────────────────────
export const usersApi = {
  list: () => client.get('/users/'),
  create: (data: object) => client.post('/users/', data),
  update: (id: number, data: object) => client.patch(`/users/${id}`, data),
  delete: (id: number) => client.delete(`/users/${id}`),
  resetPassword: (id: number, password: string) =>
    client.post(`/users/${id}/reset-password?new_password=${encodeURIComponent(password)}`),
  getRoles: () => client.get('/users/roles'),
  updatePermissions: (roleId: number, permissions: object[]) =>
    client.put(`/users/roles/${roleId}/permissions`, { permissions }),
};

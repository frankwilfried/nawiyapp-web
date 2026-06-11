import axios from 'axios';

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1') + '/crowdsource';

function authHeader() {
  const token = localStorage.getItem('nawiy_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const crowdsourceApi = {
  // Démarre un enregistrement
  start: (data) => axios.post(`${BASE}/start`, data, { headers: authHeader() }).then(r => r.data),

  // Envoie des points GPS (batch)
  sendGps: (routeId, points) =>
    axios.post(`${BASE}/${routeId}/gps`, { points }, { headers: authHeader() }).then(r => r.data),

  // Termine et soumet
  finish: (routeId) =>
    axios.post(`${BASE}/${routeId}/finish`, {}, { headers: authHeader() }).then(r => r.data),

  // Annule
  cancel: (routeId) =>
    axios.delete(`${BASE}/${routeId}`, { headers: authHeader() }).then(r => r.data),

  // Mes trajets soumis
  mine: () =>
    axios.get(`${BASE}/mine`, { headers: authHeader() }).then(r => r.data),

  // Admin
  adminPending: () =>
    axios.get(`${BASE}/admin/pending`, { headers: authHeader() }).then(r => r.data),

  adminDetail: (id) =>
    axios.get(`${BASE}/admin/${id}`, { headers: authHeader() }).then(r => r.data),

  adminApprove: (id) =>
    axios.post(`${BASE}/admin/${id}/approve`, {}, { headers: authHeader() }).then(r => r.data),

  adminReject: (id, note) =>
    axios.post(`${BASE}/admin/${id}/reject`, { note }, { headers: authHeader() }).then(r => r.data),
};

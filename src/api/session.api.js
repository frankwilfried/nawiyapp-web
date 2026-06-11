import axios from 'axios';

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1') + '/sessions';

function authHeader() {
  const token = localStorage.getItem('nawiy_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const h = () => ({ headers: authHeader() });

export const sessionApi = {
  start:  (data)               => axios.post(`${BASE}/start`, data, h()).then(r => r.data),
  end:    (id)                 => axios.post(`${BASE}/${id}/end`, {}, h()).then(r => r.data),
  gps:    (id, points)         => axios.post(`${BASE}/${id}/gps`, { points }, h()).then(r => r.data),
  board:  (id, data)           => axios.post(`${BASE}/${id}/trip/board`, data, h()).then(r => r.data),
  drop:   (id, tripId, data)   => axios.post(`${BASE}/${id}/trip/${tripId}/drop`, data, h()).then(r => r.data),
  active: (id)                 => axios.get(`${BASE}/${id}/active`, h()).then(r => r.data),

  // Admin — points candidats
  getCandidates:    ()          => axios.get(`${BASE}/admin/candidates`, h()).then(r => r.data),
  approveCandidate: (id, type)  => axios.post(`${BASE}/admin/candidates/${id}/approve`, { type }, h()).then(r => r.data),
  rejectCandidate:  (id)        => axios.post(`${BASE}/admin/candidates/${id}/reject`, {}, h()).then(r => r.data),

  // Admin — trajets enregistrés par testeurs
  getRecordedTrips: () => axios.get(`${BASE}/admin/recorded-trips`, h()).then(r => r.data),
};

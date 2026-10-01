import { create } from 'zustand';
import axios from 'axios';
import { authApi } from '../api/auth.api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

function decodeToken(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0))));
  } catch { return null; }
}
const valid = (payload, marginS = 0) => !!payload && payload.exp * 1000 > Date.now() + marginS * 1000;
const userFrom = (p) => ({ id: p.id, email: p.email || null, role: p.role, phone: p.phone || null, full_name: p.name || null });

// La session dure tant que le jeton de rafraîchissement (7 j) est valable,
// même si le jeton d'accès (15 min) a expiré : il sera renouvelé au premier appel.
const _access  = localStorage.getItem('nawiy_token');
const _refresh = localStorage.getItem('nawiy_refresh');
const _refreshPayload = _refresh ? decodeToken(_refresh) : null;
const _session = valid(_refreshPayload) ? (decodeToken(_access) || _refreshPayload) : null;
if (!_session) { localStorage.removeItem('nawiy_token'); localStorage.removeItem('nawiy_refresh'); }

let refreshing = null;

/** Jeton d'accès valable (renouvelé si besoin), ou null si la session est terminée. */
export async function getFreshToken() {
  const access = localStorage.getItem('nawiy_token');
  if (access && valid(decodeToken(access), 30)) return access;
  const refresh = localStorage.getItem('nawiy_refresh');
  if (!refresh) return null;
  refreshing ??= axios.post(`${API_URL}/auth/refresh`, { refreshToken: refresh })
    .then(({ data }) => { localStorage.setItem('nawiy_token', data.token); return data.token; })
    .catch((err) => {
      if (err.response?.status === 401) useAuthStore.getState().logout();
      return null;
    })
    .finally(() => { refreshing = null; });
  return refreshing;
}

export const useAuthStore = create((set) => ({
  user: _session ? userFrom(_session) : null,
  token: _session ? _access : null,
  isAuthenticated: !!_session,

  /** Enregistre une session renvoyée par l'API (connexion email, SMS, création de compte). */
  setSession: (data) => {
    localStorage.setItem('nawiy_token', data.token);
    localStorage.setItem('nawiy_refresh', data.refreshToken);
    set({ user: data.user, token: data.token, isAuthenticated: true });
    return data;
  },

  login: async (email, password) => {
    const data = await authApi.login({ email, password });
    return useAuthStore.getState().setSession(data);
  },

  logout: () => {
    localStorage.removeItem('nawiy_token');
    localStorage.removeItem('nawiy_refresh');
    set({ user: null, token: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user }),
}));

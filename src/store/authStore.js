import { create } from 'zustand';
import { authApi } from '../api/auth.api';

function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch { return null; }
}

const _token = localStorage.getItem('nawiy_token');
const _payload = _token ? decodeToken(_token) : null;
if (!_payload) { localStorage.removeItem('nawiy_token'); localStorage.removeItem('nawiy_refresh'); }

export const useAuthStore = create((set) => ({
  user: _payload ? { id: _payload.id, email: _payload.email, role: _payload.role } : null,
  token: _payload ? _token : null,
  isAuthenticated: !!_payload,

  login: async (email, password) => {
    const data = await authApi.login({ email, password });
    localStorage.setItem('nawiy_token', data.token);
    localStorage.setItem('nawiy_refresh', data.refreshToken);
    set({ user: data.user, token: data.token, isAuthenticated: true });
    return data;
  },

  logout: () => {
    localStorage.removeItem('nawiy_token');
    localStorage.removeItem('nawiy_refresh');
    set({ user: null, token: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user }),
}));

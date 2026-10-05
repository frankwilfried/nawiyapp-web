import axios from 'axios';
import { getFreshToken, useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

const client = axios.create({ baseURL: API_URL });

// Injecte le token dans chaque requête
client.interceptors.request.use(config => {
  const token = localStorage.getItem('nawiy_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Jeton d'accès expiré : on le renouvelle une fois puis on rejoue la requête
client.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry && localStorage.getItem('nawiy_refresh')) {
      original._retry = true;
      const token = await getFreshToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return client(original);
      }
    }
    // Session terminée (jeton absent ou refusé) : l'écran repasse en « non connecté » au lieu d'afficher une erreur
    if (error.response?.status === 401 && !localStorage.getItem('nawiy_refresh') && useAuthStore.getState().isAuthenticated) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default client;

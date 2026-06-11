import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

const client = axios.create({ baseURL: API_URL });

// Injecte le token dans chaque requête
client.interceptors.request.use(config => {
  const token = localStorage.getItem('nawiy_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Gère l'expiration du token
client.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('nawiy_refresh');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          localStorage.setItem('nawiy_token', data.token);
          original.headers.Authorization = `Bearer ${data.token}`;
          return client(original);
        } catch (_) {
          localStorage.removeItem('nawiy_token');
          localStorage.removeItem('nawiy_refresh');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default client;

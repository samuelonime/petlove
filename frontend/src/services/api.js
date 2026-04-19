import axios from 'axios';

// Base URL should be the Railway domain only — no trailing slash, no /api
// All service files use paths like /products, /orders etc.
// We add /api here once so it applies everywhere.
const BASE = (import.meta.env.VITE_API_URL || 'https://petlove-production-53ae.up.railway.app')
  .replace(/\/api\/?$/, ''); // strip trailing /api if someone accidentally added it

const api = axios.create({
  baseURL: `${BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Only force-logout on real 401s — never on network/500 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

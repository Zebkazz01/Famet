import axios from 'axios';
import { API_URL } from '../utils/constants';

const client = axios.create({
  baseURL: API_URL,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const onLoginPage = window.location.pathname === '/login';
      const isLoginRequest = error.config?.url?.includes('auth/login');
      const isConfigRequest = error.config?.url?.includes('/config');
      const isAlertRequest = error.config?.url?.includes('/inventory/alerts');
      const isPrefRequest = error.config?.url?.includes('/preferences');

      // No redirigir para requests de config/alerts/preferences ni en login
      if (!onLoginPage && !isLoginRequest && !isConfigRequest && !isAlertRequest && !isPrefRequest) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;

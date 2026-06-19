'use client';

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const api = axios.create({
  baseURL: '/api/proxy',
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRedirectingToLogin = false;

api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string }>) => {
    if (!error.response) {
      toast.error('Network error — please check your connection');
      return Promise.reject(error);
    }

    const status = error.response.status;
    const config = error.config as RetryConfig;
    const isAuthEndpoint = (config?.url ?? '').includes('/auth/');

    if (status === 401) {
      const alreadyOnLogin = window.location.pathname === '/login';

      // Single retry via refresh — skip for auth endpoints and already-retried requests
      if (!isAuthEndpoint && !config._retry && !alreadyOnLogin && !isRedirectingToLogin) {
        config._retry = true;
        try {
          await fetch('/api/auth/refresh', { method: 'POST' });
          return api(config);
        } catch {
          // Refresh failed — fall through to logout
        }
      }

      if (!alreadyOnLogin && !isRedirectingToLogin) {
        isRedirectingToLogin = true;
        fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
          window.location.href = '/login';
        });
      }
      return Promise.reject(error);
    }

    if (status === 403) {
      toast.error("You don't have permission to do that");
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default api;

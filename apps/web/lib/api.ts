'use client';

import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';

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
  (error: AxiosError<{ message?: string }>) => {
    if (!error.response) {
      toast.error('Network error — please check your connection');
      return Promise.reject(error);
    }

    const status = error.response.status;

    if (status === 401) {
      const alreadyOnLogin = window.location.pathname === '/login';
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

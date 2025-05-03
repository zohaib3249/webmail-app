// src/api/axiosClient.ts

import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiError } from '../types';
 const baseEl = document.querySelector('base');

const RAW_BASE = baseEl?.baseURI ?? window.location.origin + '/';
// strip any trailing slash so "/api" always concatenates cleanly
const BASE = RAW_BASE.replace(/\/+$/, '');
 console.log("baseEl",BASE)
export const API_URL = BASE;

const axiosClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// inject access token
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// handle errors and auto-refresh
axiosClient.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (err: AxiosError) => {
    const originalConfig = err.config as AxiosRequestConfig & { _retry?: boolean };
    const status = err.response?.status;

    // build ApiError
    const apiError: ApiError = {
      message: err.message,
      status: status || 500,
    };
    if (err.response?.data) {
      if ((err.response.data as any).detail) {
        apiError.message = (err.response.data as any).detail;
      }
      if (status === 400 && typeof err.response.data === 'object') {
        apiError.errors = err.response.data as any;
      }
    }

    // if 401 and we haven't retried yet, try refresh
    if (status === 401 && !originalConfig._retry) {
      originalConfig._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post<{ access: string }>(
            `${API_URL}/auth/refresh/`,
            { refresh: refreshToken }
          );
          const { access } = response.data;
          localStorage.setItem('accessToken', access);

          // update header and retry original
          if (axiosClient.defaults.headers) {
            axiosClient.defaults.headers.Authorization = `Bearer ${access}`;
          }
          if (originalConfig.headers) {
            originalConfig.headers.Authorization = `Bearer ${access}`;
          }
          return axiosClient(originalConfig);
        } catch (_) {
          // refresh failed → drop through and redirect
        }
      }
      // no refresh token or refresh failed
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return Promise.reject(apiError);
    }

    return Promise.reject(apiError);
  }
);

export default axiosClient;

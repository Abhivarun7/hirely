import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Single in-flight refresh promise. Concurrent 401s wait on the same call so we
// never fire two refreshes at once (which would race and rotate each other out).
let refreshPromise: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  const resp = await api.post('/auth/refresh', {});
  const newToken: string = resp.data?.data?.access_token ?? resp.data?.access_token;
  if (!newToken) throw new Error('No access token in refresh response');
  useAuthStore.getState().setAccessToken(newToken);
  return newToken;
}

api.interceptors.request.use((config) => {
  const token: string | null = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;

    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // A 401 from the refresh endpoint itself is unrecoverable.
    if (original.url?.includes('/auth/refresh')) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = performRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshError) {
      useAuthStore.getState().logout();
      return Promise.reject(refreshError);
    }
  }
);

export default api;

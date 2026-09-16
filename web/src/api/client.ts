import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { store } from '@/app/store';
import { tokensRotated, loggedOut } from '@/features/auth/authSlice';
import type { ApiEnvelope, ApiErrorInfo } from '@/types/api';
import type { AuthResponse } from '@/types/domain';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const { accessToken } = store.getState().auth;
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

/**
 * Shared in-flight refresh promise so concurrent 401s trigger exactly one
 * /auth/refresh call instead of a stampede, each awaiting the same result.
 */
let refreshPromise: Promise<AuthResponse> | null = null;

async function performRefresh(): Promise<AuthResponse> {
  const { refreshToken } = store.getState().auth;
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  // Bare axios call (not apiClient) — avoids recursing back through this same interceptor.
  const response = await axios.post<ApiEnvelope<AuthResponse>>(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );
  if (!response.data.success) {
    throw new Error(response.data.error.message);
  }
  return response.data.data;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const isRefreshCall = originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retried && !isRefreshCall) {
      originalRequest._retried = true;
      try {
        refreshPromise = refreshPromise ?? performRefresh();
        const tokens = await refreshPromise;
        store.dispatch(tokensRotated(tokens));
        originalRequest.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
        return apiClient(originalRequest);
      } catch (refreshError) {
        store.dispatch(loggedOut());
        return Promise.reject(refreshError);
      } finally {
        refreshPromise = null;
      }
    }

    return Promise.reject(error);
  },
);

/** Normalizes an axios/backend error into a flat, UI-friendly shape. */
export function toApiErrorInfo(err: unknown): ApiErrorInfo {
  if (axios.isAxiosError(err)) {
    const envelope = err.response?.data as ApiEnvelope<unknown> | undefined;
    if (envelope && envelope.success === false) {
      return {
        message: envelope.error.message,
        code: envelope.error.code,
        details: envelope.error.details,
        status: err.response?.status,
      };
    }
    if (err.request && !err.response) {
      return { message: 'Could not reach the server. Check your connection and try again.' };
    }
    return { message: err.message, status: err.response?.status };
  }
  if (err instanceof Error) {
    return { message: err.message };
  }
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return err as ApiErrorInfo;
  }
  return { message: 'An unexpected error occurred' };
}

/** Unwraps the { success, data } envelope, throwing a normalized ApiErrorInfo on failure. */
export async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  let data: ApiEnvelope<T>;
  try {
    data = (await promise).data;
  } catch (err) {
    throw toApiErrorInfo(err);
  }
  if (!data.success) {
    const info: ApiErrorInfo = { message: data.error.message, code: data.error.code, details: data.error.details };
    throw info;
  }
  return data.data;
}

export type { AxiosRequestConfig };

/** Envelope shapes used by every ORA backend service (see error-handler.middleware.ts). */

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    total: number;
    page: number;
    pageSize: number;
  };
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code?: string;
    message: string;
    details?: unknown;
  };
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiError;

/** Normalized shape thrown/returned to callers when a request fails. */
export interface ApiErrorInfo {
  message: string;
  code?: string;
  details?: unknown;
  status?: number;
}

import { apiClient, unwrap } from '@/api/client';
import type { ApiEnvelope } from '@/types/api';
import type { AuthResponse, User } from '@/types/domain';

export interface CreateUserPayload {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  locale?: string;
}

export interface RegisterCredentialsPayload {
  userId: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/** Step 1 of registration: create the profile record in user-service. */
export function createUserProfile(payload: CreateUserPayload): Promise<User> {
  return unwrap(apiClient.post<ApiEnvelope<User>>('/users', payload));
}

/** Step 2 of registration: create login credentials in auth-service for the same userId. */
export function registerCredentials(payload: RegisterCredentialsPayload): Promise<void> {
  return unwrap(apiClient.post<ApiEnvelope<void>>('/auth/register', payload));
}

export function login(payload: LoginPayload): Promise<AuthResponse> {
  return unwrap(apiClient.post<ApiEnvelope<AuthResponse>>('/auth/login', payload));
}

export function refreshTokens(refreshToken: string): Promise<AuthResponse> {
  return unwrap(apiClient.post<ApiEnvelope<AuthResponse>>('/auth/refresh', { refreshToken }));
}

export function logout(refreshToken: string | null): Promise<void> {
  return unwrap(apiClient.post<ApiEnvelope<void>>('/auth/logout', refreshToken ? { refreshToken } : {}));
}

export function requestPasswordReset(email: string): Promise<void> {
  return unwrap(apiClient.post<ApiEnvelope<void>>('/auth/password-reset/request', { email }));
}

export function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  return unwrap(apiClient.post<ApiEnvelope<void>>('/auth/password-reset/confirm', { token, newPassword }));
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export function changePassword(payload: ChangePasswordPayload): Promise<void> {
  return unwrap(apiClient.post<ApiEnvelope<void>>('/auth/change-password', payload));
}

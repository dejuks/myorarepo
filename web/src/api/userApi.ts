import { apiClient, unwrap } from '@/api/client';
import type { ApiEnvelope } from '@/types/api';
import type { User } from '@/types/domain';

export function getMe(): Promise<User> {
  return unwrap(apiClient.get<ApiEnvelope<User>>('/users/me'));
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  bio?: string;
  phone?: string;
  locale?: string;
}

export function updateProfile(userId: string, payload: UpdateProfilePayload): Promise<User> {
  return unwrap(apiClient.patch<ApiEnvelope<User>>(`/users/${userId}`, payload));
}

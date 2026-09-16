import { apiClient, toApiErrorInfo, unwrap } from '@/api/client';
import type { ApiEnvelope } from '@/types/api';
import type { Notification, PaginatedResult } from '@/types/domain';

export async function listNotifications(
  page = 1,
  pageSize = 20,
  unreadOnly = false,
): Promise<PaginatedResult<Notification>> {
  try {
    const response = await apiClient.get<ApiEnvelope<Notification[]>>('/notifications', {
      params: { page, pageSize, unreadOnly: unreadOnly || undefined },
    });
    const data = response.data;
    if (!data.success) {
      throw { message: data.error.message, code: data.error.code };
    }
    return {
      items: data.data,
      total: data.meta?.total ?? data.data.length,
      page: data.meta?.page ?? page,
      pageSize: data.meta?.pageSize ?? pageSize,
    };
  } catch (err) {
    throw toApiErrorInfo(err);
  }
}

export function getUnreadCount(): Promise<number> {
  return unwrap(apiClient.get<ApiEnvelope<{ count: number }>>('/notifications/unread-count')).then(
    (d: { count: number }) => d.count,
  );
}

export function markNotificationRead(id: string): Promise<void> {
  return unwrap(apiClient.patch<ApiEnvelope<void>>(`/notifications/${id}/read`));
}

export function markAllNotificationsRead(): Promise<{ markedCount: number }> {
  return unwrap(apiClient.post<ApiEnvelope<{ markedCount: number }>>('/notifications/read-all'));
}

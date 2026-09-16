import type { ListUsersParams } from '@/api/userApi';

export const queryKeys = {
  me: ['me'] as const,
  notifications: (page: number, unreadOnly: boolean) => ['notifications', page, unreadOnly] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  gatewayHealth: ['health', 'gateway'] as const,
  users: (params: ListUsersParams) => ['users', params] as const,
  user: (id: string) => ['users', 'detail', id] as const,
  roles: ['roles'] as const,
};

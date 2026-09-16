export const queryKeys = {
  me: ['me'] as const,
  notifications: (page: number, unreadOnly: boolean) => ['notifications', page, unreadOnly] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  gatewayHealth: ['health', 'gateway'] as const,
};

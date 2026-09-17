import type { ListUsersParams } from '@/api/userApi';
import type { ListArticlesParams } from '@/api/wikiApi';

export const queryKeys = {
  me: ['me'] as const,
  notifications: (page: number, unreadOnly: boolean) => ['notifications', page, unreadOnly] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  gatewayHealth: ['health', 'gateway'] as const,
  users: (params: ListUsersParams) => ['users', params] as const,
  user: (id: string) => ['users', 'detail', id] as const,
  roles: ['roles'] as const,
  permissions: ['permissions'] as const,
  rolePermissions: (roleId: string) => ['roles', roleId, 'permissions'] as const,
  moduleRoles: (moduleKey: string) => ['module-roles', moduleKey] as const,
  moduleMemberRoles: (moduleKey: string, userId: string) => ['module-member-roles', moduleKey, userId] as const,
  platformSettings: ['platform-settings'] as const,
  wikiArticles: (params: ListArticlesParams) => ['wiki', 'articles', params] as const,
  wikiArticle: (slug: string) => ['wiki', 'articles', slug] as const,
  wikiRevisions: (slug: string, page: number) => ['wiki', 'articles', slug, 'revisions', page] as const,
  wikiRevision: (slug: string, revisionId: string) => ['wiki', 'articles', slug, 'revisions', revisionId] as const,
};

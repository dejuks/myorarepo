import { env } from '@config/env';

export interface ServiceRoute {
  /** URL prefix clients call on the gateway, e.g. /api/v1/auth */
  pathPrefix: string;
  /** Downstream service base URL */
  target: string;
  /** Human-readable service name, used in logs and the health aggregator */
  serviceName: string;
  /** Whether this route requires a valid access token to reach the proxy at all */
  requiresAuth: boolean;
  /** Set false for services not yet implemented (Phase 2 delivers one at a time) — the gateway still lists them but returns 503 instead of proxying to a target that doesn't exist yet. */
  implemented: boolean;
}

/**
 * The full 12-service routing table from docs/01-architecture.md §2,
 * defined once here so adding a new service later is a one-line change.
 * `implemented: false` entries make the gateway forward-compatible: routes
 * are already reserved and versioned, they just 503 until that service is
 * actually built and deployed.
 */
export const serviceRoutes: ServiceRoute[] = [
  { pathPrefix: '/api/v1/auth', target: env.AUTH_SERVICE_URL, serviceName: 'auth-service', requiresAuth: false, implemented: true },
  { pathPrefix: '/api/v1/users', target: env.USER_SERVICE_URL, serviceName: 'user-service', requiresAuth: true, implemented: true },
  { pathPrefix: '/api/v1/roles', target: env.USER_SERVICE_URL, serviceName: 'user-service', requiresAuth: true, implemented: true },
  { pathPrefix: '/api/v1/researchers', target: env.RESEARCHER_SERVICE_URL, serviceName: 'researcher-service', requiresAuth: true, implemented: true },
  { pathPrefix: '/api/v1/repository', target: env.REPOSITORY_SERVICE_URL, serviceName: 'repository-service', requiresAuth: true, implemented: true },
  { pathPrefix: '/api/v1/journals', target: env.JOURNAL_SERVICE_URL, serviceName: 'journal-service', requiresAuth: true, implemented: true },
  { pathPrefix: '/api/v1/ebooks', target: env.EBOOK_SERVICE_URL, serviceName: 'ebook-service', requiresAuth: true, implemented: true },
  { pathPrefix: '/api/v1/library', target: env.LIBRARY_SERVICE_URL, serviceName: 'library-service', requiresAuth: true, implemented: true },
  { pathPrefix: '/api/v1/wiki', target: env.WIKI_SERVICE_URL, serviceName: 'wiki-service', requiresAuth: false, implemented: true },
  { pathPrefix: '/api/v1/notifications', target: env.NOTIFICATION_SERVICE_URL, serviceName: 'notification-service', requiresAuth: true, implemented: true },
  { pathPrefix: '/api/v1/search', target: env.SEARCH_SERVICE_URL, serviceName: 'search-service', requiresAuth: false, implemented: true },
  { pathPrefix: '/api/v1/monitoring', target: env.MONITORING_SERVICE_URL, serviceName: 'monitoring-service', requiresAuth: true, implemented: false },
];

export interface PublicOverride {
  /** HTTP method this override applies to — overrides are method-specific, never blanket-public for a path. */
  method: string;
  path: string;
  /** If true, also matches sub-paths of `path` (e.g. /auth/password-reset/request, /confirm). Default: exact match only. */
  matchPrefix?: boolean;
}

/**
 * Endpoints under an authenticated route prefix that are nonetheless
 * public. Method-specific and exact-path-by-default on purpose: some
 * paths are shared by a public and a protected action (e.g.
 * `POST /api/v1/users` creates an account pre-login and must be public,
 * while `GET /api/v1/users` on the exact same path lists all users and is
 * admin-only — matching on path alone would have made both public).
 */
export const publicOverrides: PublicOverride[] = [
  { method: 'POST', path: '/api/v1/auth/register' },
  { method: 'POST', path: '/api/v1/auth/login' },
  { method: 'POST', path: '/api/v1/auth/refresh' },
  { method: 'POST', path: '/api/v1/auth/password-reset', matchPrefix: true },
  // Account creation happens before the caller has any token — the same
  // /api/v1/users path also serves GET (admin list, requiresAuth) and
  // PATCH (self/admin update, requiresAuth), so this MUST stay exact-match
  // and POST-only, never matchPrefix, or it would also expose those.
  { method: 'POST', path: '/api/v1/users' },
];

export function findRoute(path: string): ServiceRoute | undefined {
  return serviceRoutes.find((r) => path === r.pathPrefix || path.startsWith(`${r.pathPrefix}/`));
}

export function isPublicOverride(method: string, path: string): boolean {
  return publicOverrides.some((o) => {
    if (o.method !== method) return false;
    return o.matchPrefix ? path === o.path || path.startsWith(`${o.path}/`) : path === o.path;
  });
}

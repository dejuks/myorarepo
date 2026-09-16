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
  { pathPrefix: '/api/v1/researchers', target: env.RESEARCHER_SERVICE_URL, serviceName: 'researcher-service', requiresAuth: true, implemented: false },
  { pathPrefix: '/api/v1/repository', target: env.REPOSITORY_SERVICE_URL, serviceName: 'repository-service', requiresAuth: true, implemented: false },
  { pathPrefix: '/api/v1/journals', target: env.JOURNAL_SERVICE_URL, serviceName: 'journal-service', requiresAuth: true, implemented: false },
  { pathPrefix: '/api/v1/ebooks', target: env.EBOOK_SERVICE_URL, serviceName: 'ebook-service', requiresAuth: true, implemented: false },
  { pathPrefix: '/api/v1/library', target: env.LIBRARY_SERVICE_URL, serviceName: 'library-service', requiresAuth: true, implemented: false },
  { pathPrefix: '/api/v1/wiki', target: env.WIKI_SERVICE_URL, serviceName: 'wiki-service', requiresAuth: false, implemented: false },
  { pathPrefix: '/api/v1/notifications', target: env.NOTIFICATION_SERVICE_URL, serviceName: 'notification-service', requiresAuth: true, implemented: false },
  { pathPrefix: '/api/v1/search', target: env.SEARCH_SERVICE_URL, serviceName: 'search-service', requiresAuth: false, implemented: true },
  { pathPrefix: '/api/v1/monitoring', target: env.MONITORING_SERVICE_URL, serviceName: 'monitoring-service', requiresAuth: true, implemented: false },
];

/** Endpoints under an authenticated prefix that are nonetheless public (e.g. registration lives under /auth but has no token yet). Matched as exact-or-prefix against the incoming path. */
export const publicOverrides: string[] = [
  '/api/v1/auth/register',
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/password-reset',
];

export function findRoute(path: string): ServiceRoute | undefined {
  return serviceRoutes.find((r) => path === r.pathPrefix || path.startsWith(`${r.pathPrefix}/`));
}

export function isPublicOverride(path: string): boolean {
  return publicOverrides.some((p) => path === p || path.startsWith(`${p}/`));
}

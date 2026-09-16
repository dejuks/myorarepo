/**
 * The six content-module services (see docs/01-architecture.md §2a). Each
 * owns its own standalone role catalog — this config is the frontend's only
 * knowledge of that: a gateway path prefix and a human label. Role names
 * themselves are never hardcoded here; they're always fetched live from
 * each module's own `GET /roles`, since only the backend is the source of
 * truth for a module's catalog.
 */
export interface ModuleConfig {
  /** URL-safe key used in the frontend route, e.g. /admin/modules/journal */
  key: string;
  label: string;
  /** Gateway path prefix this module's service is mounted at (see services/gateway/src/config/service-registry.ts) */
  prefix: string;
  /**
   * This module's local "admin" role name — the only module-local role
   * that can manage member roles there (see docs/01-architecture.md §2a).
   * A caller holding this role in the module's own member-roles list, OR
   * the platform-wide ADMIN role, can reach that module's dashboard — see
   * src/routes/ModuleRoute.tsx. This IS hardcoded here (unlike the rest of
   * a module's role catalog, which is always fetched live) because the
   * frontend needs to know it before ever calling that module's API, to
   * decide whether to show the nav link / allow the route at all.
   */
  topRole: string;
}

export const MODULES: ModuleConfig[] = [
  { key: 'journal', label: 'Journals', prefix: '/journals', topRole: 'JOURNAL_MANAGER' },
  { key: 'ebook', label: 'Ebooks', prefix: '/ebooks', topRole: 'BOOK_EDITOR' },
  { key: 'library', label: 'Library', prefix: '/library', topRole: 'LIBRARY_MANAGER' },
  { key: 'wiki', label: 'Wiki', prefix: '/wiki', topRole: 'BUREAUCRAT' },
  { key: 'repository', label: 'Repository', prefix: '/repository', topRole: 'REPOSITORY_ADMINISTRATOR' },
  { key: 'researcher', label: 'Researcher Network', prefix: '/researchers', topRole: 'PLATFORM_ADMINISTRATOR' },
];

export function getModule(key: string | undefined): ModuleConfig | undefined {
  return MODULES.find((m) => m.key === key);
}

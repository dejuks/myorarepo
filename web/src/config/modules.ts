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
}

export const MODULES: ModuleConfig[] = [
  { key: 'journal', label: 'Journals', prefix: '/journals' },
  { key: 'ebook', label: 'Ebooks', prefix: '/ebooks' },
  { key: 'library', label: 'Library', prefix: '/library' },
  { key: 'wiki', label: 'Wiki', prefix: '/wiki' },
  { key: 'repository', label: 'Repository', prefix: '/repository' },
  { key: 'researcher', label: 'Researcher Network', prefix: '/researchers' },
];

export function getModule(key: string | undefined): ModuleConfig | undefined {
  return MODULES.find((m) => m.key === key);
}

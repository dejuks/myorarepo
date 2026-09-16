import { useQueries } from '@tanstack/react-query';
import { listMemberRoles } from '@/api/moduleApi';
import { queryKeys } from '@/api/queryKeys';
import { MODULES } from '@/config/modules';
import type { ModuleConfig } from '@/config/modules';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useIsAdmin } from '@/hooks/useIsAdmin';

/**
 * The modules the CURRENT user can manage: every module for a platform-wide
 * ADMIN (the universal override — see docs/01-architecture.md §2a "Platform-wide
 * ADMIN override..."), or, for anyone else, only the modules where they hold
 * that module's own top role. Backs both the sidebar's "Module roles" section
 * (only show links the user can actually use) and ModuleRoute (only allow the
 * page for the same set) — see both call sites for how the two stay in sync.
 *
 * For a non-admin this fires one GET per module (self-check via the same
 * self-or-role endpoint ModuleRolesPage already uses), reusing
 * queryKeys.moduleMemberRoles so the result is shared with — not duplicated by —
 * that module's own dashboard if the user opens it right after.
 */
export function useMyManagedModules(): { modules: ModuleConfig[]; isLoading: boolean } {
  const { data: currentUser } = useCurrentUser();
  const isAdmin = useIsAdmin();
  const userId = currentUser?.id;

  const results = useQueries({
    queries: MODULES.map((mod) => ({
      queryKey: queryKeys.moduleMemberRoles(mod.key, userId ?? ''),
      queryFn: () => listMemberRoles(mod.prefix, userId as string),
      enabled: Boolean(userId) && !isAdmin,
      staleTime: 60_000,
    })),
  });

  if (isAdmin) {
    return { modules: MODULES, isLoading: false };
  }

  const isLoading = Boolean(userId) && results.some((r) => r.isLoading);
  const modules = MODULES.filter((mod, i) => results[i].data?.includes(mod.topRole));
  return { modules, isLoading };
}

import { useQuery } from '@tanstack/react-query';
import { getRolePermissions, listPermissions } from '@/api/userApi';
import { queryKeys } from '@/api/queryKeys';

/** The full fixed permission catalog, grouped by category for the checkbox editor. */
export function usePermissionCatalog() {
  return useQuery({
    queryKey: queryKeys.permissions,
    queryFn: listPermissions,
    staleTime: 5 * 60_000,
  });
}

/** A single role's currently-granted permission keys. Disabled until a roleId is given (e.g. dialog closed). */
export function useRolePermissions(roleId: string | null) {
  return useQuery({
    queryKey: queryKeys.rolePermissions(roleId ?? ''),
    queryFn: () => getRolePermissions(roleId as string),
    enabled: Boolean(roleId),
  });
}

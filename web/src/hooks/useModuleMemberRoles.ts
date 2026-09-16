import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listMemberRoles, assignMemberRole, revokeMemberRole } from '@/api/moduleApi';
import { queryKeys } from '@/api/queryKeys';
import type { ModuleConfig } from '@/config/modules';

/**
 * A specific member's roles inside one module — fetched only once both a
 * valid module and a userId are known (see ModuleRolesPage; `mod` can be
 * undefined for an unrecognized :moduleKey, same reasoning as useModuleRoles).
 */
export function useModuleMemberRoles(mod: ModuleConfig | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.moduleMemberRoles(mod?.key ?? '', userId ?? ''),
    queryFn: () => listMemberRoles(mod!.prefix, userId as string),
    enabled: Boolean(mod && userId),
  });
}

export function useAssignMemberRole(mod: ModuleConfig | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleName: string) => assignMemberRole(mod!.prefix, userId as string, roleName),
    onSuccess: (roles) => {
      if (mod && userId) queryClient.setQueryData(queryKeys.moduleMemberRoles(mod.key, userId), roles);
    },
  });
}

export function useRevokeMemberRole(mod: ModuleConfig | undefined, userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleName: string) => revokeMemberRole(mod!.prefix, userId as string, roleName),
    onSuccess: (roles) => {
      if (mod && userId) queryClient.setQueryData(queryKeys.moduleMemberRoles(mod.key, userId), roles);
    },
  });
}

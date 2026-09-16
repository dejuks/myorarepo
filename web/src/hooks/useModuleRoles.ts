import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listModuleRoles, createModuleRole, deleteModuleRole, type CreateModuleRolePayload } from '@/api/moduleApi';
import { queryKeys } from '@/api/queryKeys';
import type { ModuleConfig } from '@/config/modules';

/**
 * The module's role catalog itself (not who has which role — see
 * useModuleMemberRoles). `mod` is optional so ModuleRolesPage can call
 * these hooks unconditionally (required by the rules of hooks) even for an
 * unrecognized :moduleKey in the URL — `enabled: Boolean(mod)` makes sure
 * that case never fires a real request with an empty path prefix.
 */
export function useModuleRoles(mod: ModuleConfig | undefined) {
  return useQuery({
    queryKey: queryKeys.moduleRoles(mod?.key ?? ''),
    queryFn: () => listModuleRoles(mod!.prefix),
    enabled: Boolean(mod),
    staleTime: 5 * 60_000,
  });
}

export function useCreateModuleRole(mod: ModuleConfig | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateModuleRolePayload) => createModuleRole(mod!.prefix, payload),
    onSuccess: () => {
      if (mod) queryClient.invalidateQueries({ queryKey: queryKeys.moduleRoles(mod.key) });
    },
  });
}

export function useDeleteModuleRole(mod: ModuleConfig | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteModuleRole(mod!.prefix, id),
    onSuccess: () => {
      if (mod) queryClient.invalidateQueries({ queryKey: queryKeys.moduleRoles(mod.key) });
    },
  });
}

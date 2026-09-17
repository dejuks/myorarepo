import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createRole, deleteRole, setRolePermissions, type CreateRolePayload } from '@/api/userApi';
import { queryKeys } from '@/api/queryKeys';

/** Admin-only mutations against the role catalog itself (see useUserAdminMutations for assignment). */

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRolePayload) => createRole(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles });
    },
  });
}

/** Replaces a role's entire permission set — the "Save" action inside that role's edit view. */
export function useSetRolePermissions(roleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (permissionKeys: string[]) => setRolePermissions(roleId, permissionKeys),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rolePermissions(roleId) });
    },
  });
}

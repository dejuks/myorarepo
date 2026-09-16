import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createRole, deleteRole, type CreateRolePayload } from '@/api/userApi';
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

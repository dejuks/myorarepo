import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assignRole, revokeRole, updateUserStatus, type UpdateUserStatusPayload } from '@/api/userApi';
import { queryKeys } from '@/api/queryKeys';

/** Admin-only mutations against a single target user (status changes, role grants/revokes). */

export function useUpdateUserStatus(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateUserStatusPayload) => updateUserStatus(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user(userId) });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useAssignRole(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleName: string) => assignRole(userId, roleName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user(userId) });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useRevokeRole(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleName: string) => revokeRole(userId, roleName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user(userId) });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

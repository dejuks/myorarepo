import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPlatformSettings, updatePlatformSettings } from '@/api/authApi';
import { queryKeys } from '@/api/queryKeys';

/**
 * The platform-wide, runtime-toggleable settings (currently just
 * requireEmailVerification — see services/auth-service's PlatformSetting
 * entity). ADMIN only; the query 403s for anyone else, same as useRoles /
 * useUsers on the other admin-only pages.
 */
export function usePlatformSettings() {
  return useQuery({
    queryKey: queryKeys.platformSettings,
    queryFn: getPlatformSettings,
    staleTime: 30_000,
  });
}

export function useUpdatePlatformSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requireEmailVerification: boolean) => updatePlatformSettings(requireEmailVerification),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.platformSettings, settings);
    },
  });
}

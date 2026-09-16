import { useQuery } from '@tanstack/react-query';
import { getUnreadCount } from '@/api/notificationApi';
import { queryKeys } from '@/api/queryKeys';
import { useAppSelector } from '@/app/hooks';

export function useUnreadCount() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  return useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: getUnreadCount,
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

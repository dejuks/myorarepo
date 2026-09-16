import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/api/userApi';
import { queryKeys } from '@/api/queryKeys';
import { useAppSelector } from '@/app/hooks';

export function useCurrentUser() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: getMe,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });
}

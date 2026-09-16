import { useQuery } from '@tanstack/react-query';
import { listRoles } from '@/api/userApi';
import { queryKeys } from '@/api/queryKeys';

export function useRoles() {
  return useQuery({
    queryKey: queryKeys.roles,
    queryFn: listRoles,
    staleTime: 5 * 60_000,
  });
}

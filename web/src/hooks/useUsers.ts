import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getUser, listUsers, type ListUsersParams } from '@/api/userApi';
import { queryKeys } from '@/api/queryKeys';

export function useUsers(params: ListUsersParams) {
  return useQuery({
    queryKey: queryKeys.users(params),
    queryFn: () => listUsers(params),
    placeholderData: keepPreviousData,
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.user(id ?? ''),
    queryFn: () => getUser(id as string),
    enabled: Boolean(id),
  });
}

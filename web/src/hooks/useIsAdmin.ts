import { useCurrentUser } from '@/hooks/useCurrentUser';

/**
 * Derived from the `roles` array on GET /users/me (a live DB join), never
 * from the JWT — JWT-claim roles are a login-time snapshot, so reading them
 * here would leave a freshly-promoted admin's UI stale until next login.
 */
export function useIsAdmin(): boolean {
  const { data: currentUser } = useCurrentUser();
  return Boolean(currentUser?.roles?.includes('ADMIN'));
}

import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { refreshTokens } from '@/api/authApi';
import { credentialsReceived, bootstrapFinished, loggedOut } from '@/features/auth/authSlice';

/**
 * On app boot: if a refresh token survived from a previous session
 * (persisted in localStorage), silently exchange it for a fresh access
 * token before rendering protected routes. If that fails, the stored
 * token is stale/revoked, so we clear everything and treat the visitor
 * as logged out rather than getting stuck loading.
 */
export function useAuthBootstrap(): void {
  const dispatch = useAppDispatch();
  const isBootstrapping = useAppSelector((state) => state.auth.isBootstrapping);
  const storedRefreshToken = useAppSelector((state) => state.auth.refreshToken);
  const [ran, setRan] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    if (!isBootstrapping || !storedRefreshToken) {
      dispatch(bootstrapFinished());
      setRan(true);
      return;
    }

    refreshTokens(storedRefreshToken)
      .then((tokens) => {
        dispatch(credentialsReceived(tokens));
      })
      .catch(() => {
        dispatch(loggedOut());
      })
      .finally(() => {
        setRan(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  void ran;
}

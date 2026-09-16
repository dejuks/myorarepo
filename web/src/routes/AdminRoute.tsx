import { Navigate, Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useIsAdmin } from '@/hooks/useIsAdmin';

/**
 * Renders nested only for admins (per the live `roles` array from GET /users/me).
 * This is UX defense-in-depth — the server is the real authorization boundary —
 * so a non-admin who somehow reaches an /admin/* URL is redirected to /dashboard
 * rather than shown a broken or forbidden page. Expected to render inside
 * ProtectedRoute, which already handles the unauthenticated case.
 */
export function AdminRoute() {
  const { isLoading } = useCurrentUser();
  const isAdmin = useIsAdmin();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

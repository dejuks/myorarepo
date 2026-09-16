import { Navigate, Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useAppSelector } from '@/app/hooks';

/** Redirects away from public-only pages (login/register/...) to /dashboard if already authenticated. */
export function PublicRoute() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isBootstrapping = useAppSelector((state) => state.auth.isBootstrapping);

  if (isBootstrapping) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

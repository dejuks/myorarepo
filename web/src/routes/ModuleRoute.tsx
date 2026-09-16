import { Navigate, Outlet, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMyManagedModules } from '@/hooks/useMyManagedModules';
import { getModule } from '@/config/modules';

/**
 * Gates /admin/modules/:moduleKey on "platform ADMIN, or this specific
 * module's own top role" — NOT on global ADMIN alone (that was the bug:
 * AdminRoute previously covered this route too, so a module admin who
 * wasn't also platform ADMIN could never reach their own module's
 * dashboard at all). An unrecognized :moduleKey still renders through to
 * ModuleRolesPage, which shows its own "Unknown module" error — this
 * guard only ever blocks a module that DOES exist, from someone who has
 * no standing to manage it.
 */
export function ModuleRoute() {
  const { moduleKey } = useParams<{ moduleKey: string }>();
  const mod = getModule(moduleKey);
  const { isLoading: isLoadingUser } = useCurrentUser();
  const { modules: managedModules, isLoading: isLoadingModules } = useMyManagedModules();

  if (isLoadingUser || isLoadingModules) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (mod && !managedModules.some((m) => m.key === mod.key)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

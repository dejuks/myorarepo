import { useQuery } from '@tanstack/react-query';
import { alpha } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import PersonIcon from '@mui/icons-material/PersonOutline';
import NotificationsIcon from '@mui/icons-material/NotificationsOutlined';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { useMyManagedModules } from '@/hooks/useMyManagedModules';
import { getGatewayHealth } from '@/api/healthApi';
import { queryKeys } from '@/api/queryKeys';
import { glass } from '@/theme';
import { StatCard } from '@/components/StatCard';
import { userStatusChipColor } from '@/utils/userStatus';

export function DashboardPage() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: unreadCount, isLoading: unreadLoading } = useUnreadCount();
  const { modules: managedModules, isLoading: modulesLoading } = useMyManagedModules();
  const healthQuery = useQuery({
    queryKey: queryKeys.gatewayHealth,
    queryFn: getGatewayHealth,
    staleTime: 15_000,
    retry: 1,
  });

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 1 }}>
        <Link
          underline="hover"
          color="text.secondary"
          href="/dashboard"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <HomeIcon fontSize="small" />
          Home
        </Link>
        <Typography color="text.primary" sx={{ fontWeight: 600 }}>
          Dashboard
        </Typography>
      </Breadcrumbs>

      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        {userLoading ? 'Welcome' : `Welcome, ${currentUser?.firstName ?? ''}`}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Here's what's happening across your ORA Platform account.
      </Typography>

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            label="Account Status"
            value={currentUser?.status ?? '—'}
            icon={<PersonIcon />}
            loading={userLoading}
            caption={currentUser ? currentUser.email : undefined}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            label="Unread Notifications"
            value={unreadCount ?? 0}
            icon={<NotificationsIcon />}
            loading={unreadLoading}
            caption="Since your last visit"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            label="Managed Modules"
            value={managedModules.length}
            icon={<AdminPanelSettingsIcon />}
            loading={modulesLoading}
            caption="Modules you hold the top role in"
          />
        </Grid>
      </Grid>

      <Box sx={{ ...glass.surface, borderRadius: 3, p: { xs: 2, sm: 3 }, mb: 2.5 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
          System Health
        </Typography>
        {healthQuery.isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={24} />
          </Box>
        ) : healthQuery.isError || !healthQuery.data ? (
          <Alert severity="warning">Could not reach the gateway health check.</Alert>
        ) : (
          <Stack spacing={2}>
            <Chip
              size="small"
              color={healthQuery.data.status === 'ready' ? 'success' : 'warning'}
              label={healthQuery.data.status === 'ready' ? 'All systems ready' : 'Degraded'}
              sx={{ alignSelf: 'flex-start' }}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {Object.entries(healthQuery.data.checks).map(([service, status]) => (
                <Chip
                  key={service}
                  size="small"
                  variant="outlined"
                  color={status === 'ok' ? 'success' : 'error'}
                  label={`${service}: ${status}`}
                />
              ))}
            </Stack>
          </Stack>
        )}
      </Box>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <Box sx={{ ...glass.surface, borderRadius: 3, p: { xs: 2, sm: 3 }, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
              Your Roles
            </Typography>
            {userLoading ? (
              <CircularProgress size={24} />
            ) : currentUser && currentUser.roles.length > 0 ? (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                {currentUser.roles.map((role) => (
                  <Chip key={role} label={role} size="small" color="primary" variant="outlined" />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                No data
              </Typography>
            )}
            {currentUser && (
              <Stack spacing={0.5} sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Name:</strong> {currentUser.firstName} {currentUser.lastName}
                </Typography>
                <Typography variant="body2">
                  <strong>Status:</strong> <Chip size="small" label={currentUser.status} color={userStatusChipColor(currentUser.status)} />
                </Typography>
              </Stack>
            )}
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Box sx={{ ...glass.surface, borderRadius: 3, p: { xs: 2, sm: 3 }, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
              Module Roles
            </Typography>
            {modulesLoading ? (
              <CircularProgress size={24} />
            ) : managedModules.length > 0 ? (
              <Stack spacing={1} sx={{ mt: 1 }}>
                {managedModules.map((mod) => (
                  <Stack
                    key={mod.key}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderRadius: 2,
                      background: (t) => alpha(t.palette.primary.main, 0.05),
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {mod.label}
                    </Typography>
                    <Chip size="small" label={mod.topRole} />
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                No data
              </Typography>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

export default DashboardPage;

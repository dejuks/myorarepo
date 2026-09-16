import { useQuery } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getGatewayHealth } from '@/api/healthApi';
import { queryKeys } from '@/api/queryKeys';

export function DashboardPage() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const healthQuery = useQuery({
    queryKey: queryKeys.gatewayHealth,
    queryFn: getGatewayHealth,
    staleTime: 15_000,
    retry: 1,
  });

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {userLoading ? 'Welcome' : `Welcome, ${currentUser?.firstName ?? ''}`}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        This is your ORA Platform dashboard.
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Your account
            </Typography>
            {userLoading ? (
              <CircularProgress size={24} />
            ) : currentUser ? (
              <Stack spacing={1}>
                <Typography variant="body2">
                  <strong>Name:</strong> {currentUser.firstName} {currentUser.lastName}
                </Typography>
                <Typography variant="body2">
                  <strong>Email:</strong> {currentUser.email}
                </Typography>
                <Typography variant="body2">
                  <strong>Status:</strong> <Chip size="small" label={currentUser.status} />
                </Typography>
              </Stack>
            ) : (
              <Alert severity="warning">Could not load your profile.</Alert>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              System status
            </Typography>
            {healthQuery.isLoading ? (
              <CircularProgress size={24} />
            ) : healthQuery.isError || !healthQuery.data ? (
              <Alert severity="warning">Could not reach the gateway health check.</Alert>
            ) : (
              <Stack spacing={1}>
                <Chip
                  size="small"
                  color={healthQuery.data.status === 'ready' ? 'success' : 'warning'}
                  label={healthQuery.data.status === 'ready' ? 'All systems ready' : 'Degraded'}
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
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default DashboardPage;

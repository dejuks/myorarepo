import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { usePlatformSettings, useUpdatePlatformSettings } from '@/hooks/usePlatformSettings';
import type { ApiErrorInfo } from '@/types/api';

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/**
 * Platform-wide, super-admin-only toggles — currently just email
 * verification. Unlike everything else under Administration, this doesn't
 * scope to one user or one module: flipping it here changes behavior for
 * every current and future account immediately, with no restart (see
 * services/auth-service's PlatformSetting entity and README "Email
 * verification").
 */
export function PlatformSettingsPage() {
  const settingsQuery = usePlatformSettings();
  const updateMutation = useUpdatePlatformSettings();

  const errorMessage = settingsQuery.isError ? (settingsQuery.error as ApiErrorInfo).message : null;
  const updateError = updateMutation.isError ? (updateMutation.error as ApiErrorInfo).message : null;

  function handleToggle(checked: boolean) {
    updateMutation.mutate(checked);
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Platform-wide controls. These apply to every user immediately — there's no per-user or per-module override.
      </Typography>

      {settingsQuery.isLoading && (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      )}

      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

      {settingsQuery.data && (
        <Paper variant="outlined" sx={{ p: 3, maxWidth: 640 }}>
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={settingsQuery.data.requireEmailVerification}
                  onChange={(e) => handleToggle(e.target.checked)}
                  disabled={updateMutation.isPending}
                  data-testid="require-email-verification-switch"
                />
              }
              label="Require email verification for new accounts"
            />
            <Typography variant="body2" color="text.secondary">
              When on (recommended for production), every new account — self-registered or created by an admin or
              module admin — must click an emailed link before it can log in. When off, new accounts are activated
              immediately and can log in right away, with no email sent. This affects every user on the platform,
              not just accounts created after you change it.
            </Typography>
            {updateError && <Alert severity="error">{updateError}</Alert>}
            {updateMutation.isSuccess && !updateMutation.isPending && (
              <Alert severity="success" data-testid="settings-saved">
                Saved — this takes effect immediately, with no restart needed.
              </Alert>
            )}
            <Typography variant="caption" color="text.secondary">
              Last changed {formatDateTime(settingsQuery.data.updatedAt)}
              {settingsQuery.data.updatedBy ? ` by user ${settingsQuery.data.updatedBy}` : ''}.
            </Typography>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}

export default PlatformSettingsPage;

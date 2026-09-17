import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { usePermissionCatalog, useRolePermissions } from '@/hooks/usePermissions';
import { useSetRolePermissions } from '@/hooks/useRoleAdminMutations';
import type { ApiErrorInfo } from '@/types/api';
import type { Role } from '@/types/domain';

interface RolePermissionsDialogProps {
  role: Role | null;
  onClose: () => void;
}

/**
 * A role's own edit view: grouped checkboxes by category, mirroring
 * GitHub's OAuth "Select scopes" token permissions screen. This IS the
 * permission editor — there is no separate roles x permissions matrix
 * page, per how the platform admin asked for this to be laid out.
 */
export function RolePermissionsDialog({ role, onClose }: RolePermissionsDialogProps) {
  const catalogQuery = usePermissionCatalog();
  const rolePermissionsQuery = useRolePermissions(role?.id ?? null);
  const setPermissionsMutation = useSetRolePermissions(role?.id ?? '');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (rolePermissionsQuery.data) {
      setSelected(new Set(rolePermissionsQuery.data.permissionKeys));
      setSaveError(null);
      setSaved(false);
    }
  }, [rolePermissionsQuery.data]);

  const grouped = useMemo(() => {
    const byCategory = new Map<string, typeof catalogQuery.data>();
    for (const permission of catalogQuery.data ?? []) {
      const bucket = byCategory.get(permission.category) ?? [];
      bucket.push(permission);
      byCategory.set(permission.category, bucket);
    }
    return [...byCategory.entries()];
  }, [catalogQuery.data]);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSave() {
    setSaveError(null);
    setSaved(false);
    setPermissionsMutation.mutate([...selected], {
      onSuccess: () => setSaved(true),
      onError: (error) => {
        const info = error as ApiErrorInfo;
        setSaveError(info.message || 'Could not save permissions for this role.');
      },
    });
  }

  const loading = catalogQuery.isLoading || rolePermissionsQuery.isLoading;
  const loadError = catalogQuery.isError || rolePermissionsQuery.isError;

  return (
    <Dialog open={Boolean(role)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Edit permissions{role ? ` — ${role.name}` : ''}
        {role?.isSystem && (
          <Typography variant="body2" color="text.secondary">
            System role
          </Typography>
        )}
      </DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        )}

        {loadError && <Alert severity="error">Could not load permissions for this role.</Alert>}

        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {saveError}
          </Alert>
        )}

        {saved && !setPermissionsMutation.isPending && (
          <Alert severity="success" sx={{ mb: 2 }} data-testid="role-permissions-saved">
            Permissions saved. This applies immediately to everyone with this role — no re-login required.
          </Alert>
        )}

        {!loading && !loadError && (
          <Stack spacing={2} divider={<Divider flexItem />}>
            {grouped.map(([category, permissions]) => (
              <Box key={category}>
                <Typography variant="subtitle2" gutterBottom>
                  {category}
                </Typography>
                <FormGroup>
                  {(permissions ?? []).map((permission) => (
                    <FormControlLabel
                      key={permission.key}
                      control={
                        <Checkbox
                          checked={selected.has(permission.key)}
                          onChange={() => toggle(permission.key)}
                          inputProps={{ 'aria-label': permission.label } as Record<string, string>}
                          data-testid={`permission-checkbox-${permission.key}`}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2">{permission.label}</Typography>
                          {permission.description && (
                            <Typography variant="caption" color="text.secondary">
                              {permission.description}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  ))}
                </FormGroup>
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={setPermissionsMutation.isPending}>
          Close
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={loading || loadError || setPermissionsMutation.isPending}>
          {setPermissionsMutation.isPending ? 'Saving…' : 'Save permissions'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default RolePermissionsDialog;

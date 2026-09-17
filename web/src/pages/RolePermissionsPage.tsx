import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/HomeOutlined';
import { usePermissionCatalog, useRolePermissions } from '@/hooks/usePermissions';
import { useRoles } from '@/hooks/useRoles';
import { useSetRolePermissions } from '@/hooks/useRoleAdminMutations';
import type { ApiErrorInfo } from '@/types/api';

/**
 * Full-page version of the role permission editor — grouped checkboxes by
 * category, mirroring GitHub's OAuth "Select scopes" token permissions
 * screen (same layout the old RolePermissionsDialog used), just given the
 * full working area instead of being squeezed into a small modal. There's
 * still no separate roles x permissions matrix page — this IS the editor,
 * per how the platform admin originally asked for this to be laid out.
 *
 * The role itself isn't fetched by id directly (user-service has no
 * GET /roles/:id) — it's looked up from the already-cached role catalog
 * list (useRoles), the same list AdminRolesPage renders.
 */
export function RolePermissionsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const rolesQuery = useRoles();
  const catalogQuery = usePermissionCatalog();
  const rolePermissionsQuery = useRolePermissions(id ?? null);
  const setPermissionsMutation = useSetRolePermissions(id ?? '');

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

  if (!id) return <Alert severity="error">No role id in the URL.</Alert>;

  const role = rolesQuery.data?.find((r) => r.id === id);
  const loading = rolesQuery.isLoading || catalogQuery.isLoading || rolePermissionsQuery.isLoading;
  const loadError = rolesQuery.isError || catalogQuery.isError || rolePermissionsQuery.isError;

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 1 }}>
        <Link underline="hover" color="text.secondary" href="/dashboard" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <HomeIcon fontSize="small" />
          Home
        </Link>
        <Link underline="hover" color="text.secondary" component={RouterLink} to="/admin/roles">
          Roles
        </Link>
        <Typography color="text.primary" sx={{ fontWeight: 600 }}>
          {role ? `Edit permissions — ${role.name}` : 'Edit permissions'}
        </Typography>
      </Breadcrumbs>

      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {role ? role.name : 'Edit permissions'}
        </Typography>
        {role?.isSystem && <Chip size="small" label="System role" variant="outlined" />}
      </Stack>

      {rolesQuery.data && !role && <Alert severity="error">This role no longer exists.</Alert>}

      {loading && (
        <Box display="flex" justifyContent="center" mt={4}>
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

      {!loading && !loadError && role && (
        <>
          <Stack spacing={3} divider={<Divider flexItem />}>
            {grouped.map(([category, permissions]) => (
              <Box key={category}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>
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

          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button variant="contained" onClick={handleSave} disabled={setPermissionsMutation.isPending}>
              {setPermissionsMutation.isPending ? 'Saving…' : 'Save permissions'}
            </Button>
            <Button variant="text" onClick={() => navigate('/admin/roles')} disabled={setPermissionsMutation.isPending}>
              Back to roles
            </Button>
          </Stack>
        </>
      )}
    </Box>
  );
}

export default RolePermissionsPage;

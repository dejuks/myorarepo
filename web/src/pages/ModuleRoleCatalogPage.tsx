import { useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ModuleSectionTabs } from '@/components/ModuleSectionTabs';
import { getModule } from '@/config/modules';
import { useModuleRoles, useCreateModuleRole, useDeleteModuleRole } from '@/hooks/useModuleRoles';
import { isValidRoleName, roleNameMessage } from '@/utils/validation';
import type { ApiErrorInfo } from '@/types/api';
import type { Role } from '@/types/domain';

/**
 * A module's own role catalog — create/delete the roles that exist in this
 * module (not who holds them; see ModuleMembersPage for that). Split out
 * of what used to be a single two-panel ModuleRolesPage so each concern
 * gets its own full working area instead of a cramped half-page panel.
 *
 * Role CATALOG management (create/delete) is platform-ADMIN-only in every
 * module — no module-local role, including that module's own top role,
 * can do this anymore. The route itself only gates on "platform ADMIN, or
 * this module's own top role" (see ModuleRoute); a caller with the top
 * role but not global ADMIN can reach this page but will get a 403 back
 * from the module service on create/delete, surfaced as a normal error
 * alert below.
 */
export function ModuleRoleCatalogPage() {
  const { moduleKey } = useParams<{ moduleKey: string }>();
  const mod = getModule(moduleKey);

  const rolesQuery = useModuleRoles(mod);
  const createRoleMutation = useCreateModuleRole(mod);
  const deleteRoleMutation = useDeleteModuleRole(mod);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!mod) {
    return <Alert severity="error">Unknown module "{moduleKey}".</Alert>;
  }

  function openCreateDialog() {
    setName('');
    setDescription('');
    setNameError(null);
    setCreateError(null);
    setCreateOpen(true);
  }

  function handleCreateSubmit(event: FormEvent) {
    event.preventDefault();
    setCreateError(null);
    const trimmedName = name.trim();
    if (!isValidRoleName(trimmedName)) {
      setNameError(roleNameMessage());
      return;
    }
    setNameError(null);
    createRoleMutation.mutate(
      { name: trimmedName, description: description.trim() || undefined },
      {
        onSuccess: () => setCreateOpen(false),
        onError: (error) => setCreateError((error as ApiErrorInfo).message || 'Could not create this role.'),
      },
    );
  }

  function confirmDeleteRole() {
    if (!roleToDelete) return;
    setDeleteError(null);
    deleteRoleMutation.mutate(roleToDelete.id, {
      onSettled: () => setRoleToDelete(null),
      onError: (error) => setDeleteError((error as ApiErrorInfo).message || 'Could not delete this role.'),
    });
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {mod.label} — Roles &amp; Permissions
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Standalone to this module — assigning a role here has no effect anywhere else on the platform, and vice
        versa. See <code>docs/01-architecture.md</code> §2a.
      </Typography>

      <ModuleSectionTabs moduleKey={mod.key} active="roles" />

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">Role catalog</Typography>
          <Button size="small" variant="contained" onClick={openCreateDialog}>
            Create role
          </Button>
        </Stack>

        {deleteError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {deleteError}
          </Alert>
        )}

        {rolesQuery.isLoading && (
          <Box display="flex" justifyContent="center" mt={2}>
            <CircularProgress size={28} />
          </Box>
        )}

        {rolesQuery.isError && (
          <Alert severity="error">{(rolesQuery.error as ApiErrorInfo)?.message || 'Could not load roles.'}</Alert>
        )}

        {rolesQuery.data && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rolesQuery.data.map((role) => (
                  <TableRow key={role.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" fontWeight={600}>
                          {role.name}
                        </Typography>
                        {role.isSystem && <Chip size="small" label="System" variant="outlined" />}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {role.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={role.isSystem ? 'System roles cannot be deleted' : 'Delete role'}>
                        <span>
                          <IconButton
                            size="small"
                            aria-label={`delete role ${role.name}`}
                            disabled={role.isSystem}
                            onClick={() => setRoleToDelete(role)}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Create role in {mod.label}</DialogTitle>
        <Box component="form" onSubmit={handleCreateSubmit} noValidate>
          <DialogContent>
            <Stack spacing={2}>
              {createError && <Alert severity="error">{createError}</Alert>}
              <TextField
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={Boolean(nameError)}
                helperText={nameError || 'Letters and underscores only, e.g. SECTION_EDITOR'}
                autoFocus
                required
                fullWidth
              />
              <TextField
                label="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                minRows={2}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)} disabled={createRoleMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={createRoleMutation.isPending}>
              {createRoleMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={Boolean(roleToDelete)}
        title="Delete role"
        message={`Delete the "${roleToDelete?.name ?? ''}" role from ${mod.label}? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteRoleMutation.isPending}
        onConfirm={confirmDeleteRole}
        onCancel={() => setRoleToDelete(null)}
      />
    </Box>
  );
}

export default ModuleRoleCatalogPage;

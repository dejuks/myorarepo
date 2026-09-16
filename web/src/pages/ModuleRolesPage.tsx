import { useState } from 'react';
import type { FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import type { SelectChangeEvent } from '@mui/material/Select';
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
import { getModule } from '@/config/modules';
import { useUsers } from '@/hooks/useUsers';
import { useModuleRoles, useCreateModuleRole, useDeleteModuleRole } from '@/hooks/useModuleRoles';
import { useModuleMemberRoles, useAssignMemberRole, useRevokeMemberRole } from '@/hooks/useModuleMemberRoles';
import { isValidRoleName, roleNameMessage } from '@/utils/validation';
import type { ApiErrorInfo } from '@/types/api';
import type { Role, User } from '@/types/domain';

/**
 * One reusable page for any of the six standalone content-module services
 * (see docs/01-architecture.md §2a) — the route supplies :moduleKey and
 * this resolves it against src/config/modules.ts. Two independent panels:
 * the module's own role catalog, and a specific member's roles within it
 * (looked up by picking any platform user, since module services have no
 * local user directory of their own — only user-service does).
 *
 * The server is the real authorization boundary here, not this page: only
 * whoever holds that module's local "admin" role (see each module's
 * README) can actually create/delete roles or assign/revoke them — a
 * global ADMIN who isn't also that module's admin will see this page (the
 * route only gates on global ADMIN, same as every other /admin/* page) but
 * get a 403 back from the module service itself, surfaced as a normal
 * error alert below.
 */
export function ModuleRolesPage() {
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

  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [roleToAdd, setRoleToAdd] = useState('');
  const [memberRoleError, setMemberRoleError] = useState<string | null>(null);
  const [memberRoleToRevoke, setMemberRoleToRevoke] = useState<string | null>(null);

  const memberSearchQuery = useUsers({ search: memberSearch || undefined, page: 1, pageSize: 10 });
  const memberRolesQuery = useModuleMemberRoles(mod, selectedMember?.id);
  const assignMemberRoleMutation = useAssignMemberRole(mod, selectedMember?.id);
  const revokeMemberRoleMutation = useRevokeMemberRole(mod, selectedMember?.id);

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

  function handleAddMemberRole() {
    setMemberRoleError(null);
    if (!roleToAdd) return;
    assignMemberRoleMutation.mutate(roleToAdd, {
      onSuccess: () => setRoleToAdd(''),
      onError: (error) => setMemberRoleError((error as ApiErrorInfo).message || 'Could not assign this role.'),
    });
  }

  function confirmRevokeMemberRole() {
    if (!memberRoleToRevoke) return;
    setMemberRoleError(null);
    revokeMemberRoleMutation.mutate(memberRoleToRevoke, {
      onSettled: () => setMemberRoleToRevoke(null),
      onError: (error) => setMemberRoleError((error as ApiErrorInfo).message || 'Could not revoke this role.'),
    });
  }

  const memberRoles = memberRolesQuery.data ?? [];
  const assignableRoles = (rolesQuery.data ?? []).filter((role) => !memberRoles.includes(role.name));

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {mod.label} — Roles &amp; Permissions
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Standalone to this module — assigning a role here has no effect anywhere else on the platform, and vice
        versa. See <code>docs/01-architecture.md</code> §2a.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
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
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Member roles
            </Typography>
            <Autocomplete
              options={memberSearchQuery.data?.items ?? []}
              loading={memberSearchQuery.isLoading}
              value={selectedMember}
              onChange={(_e, value) => {
                setSelectedMember(value);
                setMemberRoleError(null);
              }}
              onInputChange={(_e, value) => setMemberSearch(value)}
              getOptionLabel={(user) => `${user.firstName} ${user.lastName} (${user.email})`}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => <TextField {...params} label="Find a platform user" placeholder="Name or email" size="small" />}
              sx={{ mb: 2 }}
            />

            {!selectedMember && (
              <Alert severity="info">Search for and select a user to view or manage their roles in {mod.label}.</Alert>
            )}

            {selectedMember && (
              <>
                {memberRoleError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {memberRoleError}
                  </Alert>
                )}

                {memberRolesQuery.isLoading && (
                  <Box display="flex" justifyContent="center" mt={2}>
                    <CircularProgress size={28} />
                  </Box>
                )}

                {memberRolesQuery.isError && (
                  <Alert severity="error">
                    {(memberRolesQuery.error as ApiErrorInfo)?.message || `Could not load this member's roles.`}
                  </Alert>
                )}

                {memberRolesQuery.data && (
                  <>
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                      {memberRoles.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                          No roles in {mod.label} yet.
                        </Typography>
                      )}
                      {memberRoles.map((roleName) => (
                        <Chip
                          key={roleName}
                          label={roleName}
                          onDelete={() => setMemberRoleToRevoke(roleName)}
                          disabled={revokeMemberRoleMutation.isPending}
                        />
                      ))}
                    </Stack>
                    <Divider sx={{ mb: 2 }} />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                      <FormControl size="small" sx={{ minWidth: 220 }}>
                        <InputLabel id="add-member-role-label">Add role</InputLabel>
                        <Select
                          labelId="add-member-role-label"
                          label="Add role"
                          value={roleToAdd}
                          onChange={(e: SelectChangeEvent) => setRoleToAdd(e.target.value)}
                          disabled={assignableRoles.length === 0}
                        >
                          {assignableRoles.map((role) => (
                            <MenuItem key={role.id} value={role.name}>
                              {role.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        variant="outlined"
                        onClick={handleAddMemberRole}
                        disabled={!roleToAdd || assignMemberRoleMutation.isPending}
                      >
                        {assignMemberRoleMutation.isPending ? 'Adding…' : 'Add role'}
                      </Button>
                    </Stack>
                  </>
                )}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

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

      <ConfirmDialog
        open={Boolean(memberRoleToRevoke)}
        title="Revoke role"
        message={`Remove the "${memberRoleToRevoke ?? ''}" role from ${selectedMember?.firstName ?? 'this member'} in ${mod.label}?`}
        confirmLabel="Revoke"
        loading={revokeMemberRoleMutation.isPending}
        onConfirm={confirmRevokeMemberRole}
        onCancel={() => setMemberRoleToRevoke(null)}
      />
    </Box>
  );
}

export default ModuleRolesPage;

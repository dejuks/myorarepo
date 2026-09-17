import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
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
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useRoles } from '@/hooks/useRoles';
import { useCreateRole, useDeleteRole } from '@/hooks/useRoleAdminMutations';
import { isValidRoleName, roleNameMessage } from '@/utils/validation';
import type { ApiErrorInfo } from '@/types/api';
import type { Role } from '@/types/domain';

export function AdminRolesPage() {
  const navigate = useNavigate();
  const rolesQuery = useRoles();
  const createRoleMutation = useCreateRole();
  const deleteRoleMutation = useDeleteRole();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
        onError: (error) => {
          const info = error as ApiErrorInfo;
          setCreateError(info.message || 'Could not create this role.');
        },
      },
    );
  }

  function confirmDelete() {
    if (!roleToDelete) return;
    setDeleteError(null);
    deleteRoleMutation.mutate(roleToDelete.id, {
      onSettled: () => setRoleToDelete(null),
      onError: (error) => {
        const info = error as ApiErrorInfo;
        setDeleteError(info.message || 'Could not delete this role.');
      },
    });
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4">Roles</Typography>
        <Button variant="contained" onClick={openCreateDialog}>
          Create role
        </Button>
      </Stack>

      {deleteError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {deleteError}
        </Alert>
      )}

      {rolesQuery.isLoading && (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      )}

      {rolesQuery.isError && <Alert severity="error">Could not load the role catalog.</Alert>}

      {rolesQuery.data && (
        <TableContainer component={Paper} variant="outlined">
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
                    <Tooltip title="Edit permissions">
                      <IconButton
                        size="small"
                        aria-label={`edit permissions for role ${role.name}`}
                        onClick={() => navigate(`/admin/roles/${role.id}/permissions`)}
                      >
                        <KeyOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
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

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Create role</DialogTitle>
        <Box component="form" onSubmit={handleCreateSubmit} noValidate>
          <DialogContent>
            <Stack spacing={2}>
              {createError && <Alert severity="error">{createError}</Alert>}
              <TextField
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={Boolean(nameError)}
                helperText={nameError || 'Letters and underscores only, e.g. RESEARCHER'}
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
        message={`Delete the "${roleToDelete?.name ?? ''}" role? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteRoleMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setRoleToDelete(null)}
      />
    </Box>
  );
}

export default AdminRolesPage;

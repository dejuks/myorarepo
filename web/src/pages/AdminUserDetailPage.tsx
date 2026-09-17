import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import type { SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useUser } from '@/hooks/useUsers';
import { useRoles } from '@/hooks/useRoles';
import { useAssignRole, useRevokeRole, useUpdateUserStatus } from '@/hooks/useUserAdminMutations';
import { UserStatus } from '@/types/domain';
import { getValidNextStatuses, userStatusChipColor } from '@/utils/userStatus';
import type { ApiErrorInfo } from '@/types/api';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const userQuery = useUser(id);
  const rolesQuery = useRoles();

  const updateStatusMutation = useUpdateUserStatus(id ?? '');
  const assignRoleMutation = useAssignRole(id ?? '');
  const revokeRoleMutation = useRevokeRole(id ?? '');

  const [nextStatus, setNextStatus] = useState<UserStatus | ''>('');
  const [reason, setReason] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState(false);

  const [roleToAdd, setRoleToAdd] = useState('');
  const [roleExpiresAt, setRoleExpiresAt] = useState('');
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleToRevoke, setRoleToRevoke] = useState<string | null>(null);

  if (!id) {
    return <Alert severity="error">No user id in the URL.</Alert>;
  }

  if (userQuery.isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (userQuery.isError || !userQuery.data) {
    const info = userQuery.error as ApiErrorInfo | undefined;
    return <Alert severity="error">{info?.message || 'Could not load this user.'}</Alert>;
  }

  const user = userQuery.data;
  const validNextStatuses = getValidNextStatuses(user.status);
  const assignableRoles = (rolesQuery.data ?? []).filter((role) => !user.roles.includes(role.name));

  function handleStatusSubmit(event: FormEvent) {
    event.preventDefault();
    setStatusError(null);
    setStatusSuccess(false);
    if (!nextStatus) {
      setStatusError('Choose a new status.');
      return;
    }
    updateStatusMutation.mutate(
      { status: nextStatus, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          setStatusSuccess(true);
          setNextStatus('');
          setReason('');
        },
        onError: (error) => {
          const info = error as ApiErrorInfo;
          setStatusError(info.message || 'Could not change this user’s status.');
        },
      },
    );
  }

  function handleAddRole() {
    setRoleError(null);
    if (!roleToAdd) return;
    // A bare <input type="date"> value ("2026-12-31") has no time component; treat it as
    // end-of-day local time so "expires on this date" reads naturally rather than expiring
    // at midnight at the very start of the chosen day.
    const expiresAt = roleExpiresAt ? new Date(`${roleExpiresAt}T23:59:59`).toISOString() : undefined;
    assignRoleMutation.mutate(
      { roleName: roleToAdd, expiresAt },
      {
        onSuccess: () => {
          setRoleToAdd('');
          setRoleExpiresAt('');
        },
        onError: (error) => {
          const info = error as ApiErrorInfo;
          setRoleError(info.message || 'Could not assign this role.');
        },
      },
    );
  }

  function confirmRevokeRole() {
    if (!roleToRevoke) return;
    setRoleError(null);
    revokeRoleMutation.mutate(roleToRevoke, {
      onSettled: () => setRoleToRevoke(null),
      onError: (error) => {
        const info = error as ApiErrorInfo;
        setRoleError(info.message || 'Could not revoke this role.');
      },
    });
  }

  return (
    <Box>
      <Button size="small" onClick={() => navigate('/admin/users')} sx={{ mb: 1 }}>
        &larr; Back to users
      </Button>
      <Typography variant="h4" gutterBottom>
        {user.firstName} {user.lastName}
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Stack spacing={1}>
          <Typography variant="body2">
            <strong>Email:</strong> {user.email}
          </Typography>
          {user.displayName && (
            <Typography variant="body2">
              <strong>Display name:</strong> {user.displayName}
            </Typography>
          )}
          {user.bio && (
            <Typography variant="body2">
              <strong>Bio:</strong> {user.bio}
            </Typography>
          )}
          {user.phone && (
            <Typography variant="body2">
              <strong>Phone:</strong> {user.phone}
            </Typography>
          )}
          <Typography variant="body2">
            <strong>Locale:</strong> {user.locale}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2">
              <strong>Status:</strong>
            </Typography>
            <Chip size="small" label={user.status} color={userStatusChipColor(user.status)} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Member since {formatDate(user.createdAt)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last updated {formatDate(user.updatedAt)}
          </Typography>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Change status
        </Typography>
        {statusSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Status updated.
          </Alert>
        )}
        {statusError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {statusError}
          </Alert>
        )}
        {validNextStatuses.length === 0 ? (
          <Alert severity="info">This account is deactivated; there are no further status transitions.</Alert>
        ) : (
          <Box component="form" onSubmit={handleStatusSubmit} noValidate>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="next-status-label">New status</InputLabel>
                <Select
                  labelId="next-status-label"
                  label="New status"
                  value={nextStatus}
                  onChange={(e: SelectChangeEvent) => setNextStatus(e.target.value as UserStatus)}
                >
                  {validNextStatuses.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Reason (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                size="small"
                fullWidth
              />
              <Button type="submit" variant="contained" disabled={updateStatusMutation.isPending}>
                {updateStatusMutation.isPending ? 'Saving…' : 'Change status'}
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Roles
        </Typography>
        {roleError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {roleError}
          </Alert>
        )}
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
          {user.roles.map((role) => (
            <Chip
              key={role}
              label={role}
              onDelete={() => setRoleToRevoke(role)}
              disabled={revokeRoleMutation.isPending}
            />
          ))}
        </Stack>
        <Divider sx={{ mb: 2 }} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="add-role-label">Add role</InputLabel>
            <Select
              labelId="add-role-label"
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
          <TextField
            label="Expires on (optional)"
            type="date"
            size="small"
            value={roleExpiresAt}
            onChange={(e) => setRoleExpiresAt(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            helperText="Leave blank for a permanent role"
          />
          <Button
            variant="outlined"
            onClick={handleAddRole}
            disabled={!roleToAdd || assignRoleMutation.isPending}
          >
            {assignRoleMutation.isPending ? 'Adding…' : 'Add role'}
          </Button>
        </Stack>
      </Paper>

      <ConfirmDialog
        open={Boolean(roleToRevoke)}
        title="Revoke role"
        message={`Remove the "${roleToRevoke ?? ''}" role from ${user.firstName} ${user.lastName}?`}
        confirmLabel="Revoke"
        loading={revokeRoleMutation.isPending}
        onConfirm={confirmRevokeRole}
        onCancel={() => setRoleToRevoke(null)}
      />
    </Box>
  );
}

export default AdminUserDetailPage;

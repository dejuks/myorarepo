import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { updateProfile } from '@/api/userApi';
import { queryKeys } from '@/api/queryKeys';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { userStatusChipColor } from '@/utils/userStatus';
import type { ApiErrorInfo } from '@/types/api';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

interface ProfileFormState {
  firstName: string;
  lastName: string;
  displayName: string;
  bio: string;
  phone: string;
  locale: string;
  avatarUrl: string;
}

const EMPTY_FORM: ProfileFormState = {
  firstName: '',
  lastName: '',
  displayName: '',
  bio: '',
  phone: '',
  locale: '',
  avatarUrl: '',
};

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function ProfilePage() {
  const { data: currentUser, isLoading, isError } = useCurrentUser();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setForm({
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        displayName: currentUser.displayName ?? '',
        bio: currentUser.bio ?? '',
        phone: currentUser.phone ?? '',
        locale: currentUser.locale ?? '',
        avatarUrl: currentUser.avatarUrl ?? '',
      });
    }
  }, [currentUser]);

  function updateField<K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (!currentUser) throw new Error('No profile loaded yet');
      return updateProfile(currentUser.id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        displayName: form.displayName.trim() || undefined,
        bio: form.bio.trim() || undefined,
        phone: form.phone.trim() || undefined,
        locale: form.locale.trim() || undefined,
        avatarUrl: form.avatarUrl.trim() || undefined,
      });
    },
    onSuccess: () => {
      setSaveSuccess(true);
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
    onError: (error) => {
      const info = error as ApiErrorInfo;
      setSaveError(info.message || 'Could not update your profile.');
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaveError(null);
    setFormError(null);
    setSaveSuccess(false);
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setFormError('First and last name cannot be empty.');
      return;
    }
    if (form.avatarUrl.trim() && !isValidUrl(form.avatarUrl.trim())) {
      setFormError('Avatar URL must be a valid URL.');
      return;
    }
    mutation.mutate();
  }

  function cancelEdit() {
    setEditing(false);
    setFormError(null);
    if (currentUser) {
      setForm({
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        displayName: currentUser.displayName ?? '',
        bio: currentUser.bio ?? '',
        phone: currentUser.phone ?? '',
        locale: currentUser.locale ?? '',
        avatarUrl: currentUser.avatarUrl ?? '',
      });
    }
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !currentUser) {
    return <Alert severity="error">Could not load your profile. Try refreshing the page.</Alert>;
  }

  return (
    <Box maxWidth={640}>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Profile updated.
        </Alert>
      )}
      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {saveError}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        {editing ? (
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2}>
              {formError && <Alert severity="error">{formError}</Alert>}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="First name"
                  value={form.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Last name"
                  value={form.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  required
                  fullWidth
                />
              </Stack>
              <TextField
                label="Display name"
                value={form.displayName}
                onChange={(e) => updateField('displayName', e.target.value)}
                fullWidth
              />
              <TextField
                label="Bio"
                value={form.bio}
                onChange={(e) => updateField('bio', e.target.value)}
                multiline
                minRows={2}
                fullWidth
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Phone"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Locale"
                  value={form.locale}
                  onChange={(e) => updateField('locale', e.target.value)}
                  placeholder="en"
                  fullWidth
                />
              </Stack>
              <TextField
                label="Avatar URL"
                value={form.avatarUrl}
                onChange={(e) => updateField('avatarUrl', e.target.value)}
                placeholder="https://example.com/avatar.png"
                fullWidth
              />
              <Stack direction="row" spacing={2}>
                <Button type="submit" variant="contained" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Saving…' : 'Save'}
                </Button>
                <Button variant="text" disabled={mutation.isPending} onClick={cancelEdit}>
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </Box>
        ) : (
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="h6">
                  {currentUser.firstName} {currentUser.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {currentUser.email}
                </Typography>
              </Box>
              <Button variant="outlined" size="small" onClick={() => setEditing(true)}>
                Edit profile
              </Button>
            </Stack>
            <Divider />
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2">
                  <strong>Status:</strong>
                </Typography>
                <Chip size="small" label={currentUser.status} color={userStatusChipColor(currentUser.status)} />
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="body2">
                  <strong>Roles:</strong>
                </Typography>
                {currentUser.roles.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    None
                  </Typography>
                ) : (
                  currentUser.roles.map((role) => <Chip key={role} size="small" variant="outlined" label={role} />)
                )}
              </Stack>
              <Typography variant="body2">
                <strong>Locale:</strong> {currentUser.locale}
              </Typography>
              {currentUser.displayName && (
                <Typography variant="body2">
                  <strong>Display name:</strong> {currentUser.displayName}
                </Typography>
              )}
              {currentUser.bio && (
                <Typography variant="body2">
                  <strong>Bio:</strong> {currentUser.bio}
                </Typography>
              )}
              {currentUser.phone && (
                <Typography variant="body2">
                  <strong>Phone:</strong> {currentUser.phone}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                Member since {formatDate(currentUser.createdAt)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last updated {formatDate(currentUser.updatedAt)}
              </Typography>
            </Stack>
          </Stack>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6">Password</Typography>
            <Typography variant="body2" color="text.secondary">
              Change the password used to sign in.
            </Typography>
          </Box>
          <Button variant="outlined" size="small" onClick={() => setPasswordDialogOpen(true)}>
            Change password
          </Button>
        </Stack>
      </Paper>

      <ChangePasswordDialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} />
    </Box>
  );
}

export default ProfilePage;

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { updateProfile } from '@/api/userApi';
import { queryKeys } from '@/api/queryKeys';
import type { ApiErrorInfo } from '@/types/api';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function ProfilePage() {
  const { data: currentUser, isLoading, isError } = useCurrentUser();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setFirstName(currentUser.firstName);
      setLastName(currentUser.lastName);
    }
  }, [currentUser]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!currentUser) throw new Error('No profile loaded yet');
      return updateProfile(currentUser.id, { firstName: firstName.trim(), lastName: lastName.trim() });
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
    setSaveSuccess(false);
    if (!firstName.trim() || !lastName.trim()) {
      setSaveError('First and last name cannot be empty.');
      return;
    }
    mutation.mutate();
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

      <Paper variant="outlined" sx={{ p: 3 }}>
        {editing ? (
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  fullWidth
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <Button type="submit" variant="contained" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Saving…' : 'Save'}
                </Button>
                <Button
                  variant="text"
                  disabled={mutation.isPending}
                  onClick={() => {
                    setEditing(false);
                    setFirstName(currentUser.firstName);
                    setLastName(currentUser.lastName);
                  }}
                >
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
                Edit name
              </Button>
            </Stack>
            <Divider />
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>Status:</strong> {currentUser.status}
              </Typography>
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
    </Box>
  );
}

export default ProfilePage;

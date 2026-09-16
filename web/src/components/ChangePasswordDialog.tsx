import { useState } from 'react';
import type { FormEvent } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import { PasswordPolicyHint } from '@/components/PasswordPolicyHint';
import { useChangePassword } from '@/hooks/useChangePassword';
import { checkPasswordPolicy, passwordPolicyMessage } from '@/utils/validation';
import type { ApiErrorInfo } from '@/types/api';

interface FieldErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordDialog({ open, onClose }: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mutation = useChangePassword();

  function resetAndClose() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setFieldErrors({});
    setSubmitError(null);
    setSuccess(false);
    onClose();
  }

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!currentPassword) errors.currentPassword = 'Current password is required';
    if (!newPassword) {
      errors.newPassword = 'New password is required';
    } else if (!checkPasswordPolicy(newPassword).isValid) {
      errors.newPassword = passwordPolicyMessage();
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    setSuccess(false);
    if (!validate()) return;

    mutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setSuccess(true);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
        onError: (error) => {
          const info = error as ApiErrorInfo;
          setSubmitError(info.message || 'Could not change your password.');
        },
      },
    );
  }

  return (
    <Dialog open={open} onClose={resetAndClose} fullWidth maxWidth="xs">
      <DialogTitle>Change password</DialogTitle>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2}>
            {success && <Alert severity="success">Password changed.</Alert>}
            {submitError && <Alert severity="error">{submitError}</Alert>}
            <TextField
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              error={Boolean(fieldErrors.currentPassword)}
              helperText={fieldErrors.currentPassword}
              autoComplete="current-password"
              fullWidth
              required
            />
            <TextField
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={Boolean(fieldErrors.newPassword)}
              helperText={fieldErrors.newPassword}
              autoComplete="new-password"
              fullWidth
              required
            />
            <PasswordPolicyHint password={newPassword} />
            <TextField
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={Boolean(fieldErrors.confirmPassword)}
              helperText={fieldErrors.confirmPassword}
              autoComplete="new-password"
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetAndClose} disabled={mutation.isPending}>
            {success ? 'Close' : 'Cancel'}
          </Button>
          {!success && (
            <Button type="submit" variant="contained" disabled={mutation.isPending}>
              {mutation.isPending ? 'Changing…' : 'Change password'}
            </Button>
          )}
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export default ChangePasswordDialog;

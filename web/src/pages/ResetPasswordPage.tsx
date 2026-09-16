import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { AuthLayout } from '@/components/AuthLayout';
import { PasswordPolicyHint } from '@/components/PasswordPolicyHint';
import { confirmPasswordReset } from '@/api/authApi';
import { checkPasswordPolicy, passwordPolicyMessage } from '@/utils/validation';
import type { ApiErrorInfo } from '@/types/api';

interface FieldErrors {
  newPassword?: string;
  confirmPassword?: string;
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => confirmPasswordReset(token, newPassword),
  });

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!newPassword) {
      errors.newPassword = 'Password is required';
    } else if (!checkPasswordPolicy(newPassword).isValid) {
      errors.newPassword = passwordPolicyMessage();
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    if (!token) {
      setSubmitError('This reset link is missing its token. Request a new one.');
      return;
    }
    if (!validate()) return;

    mutation.mutate(undefined, {
      onSuccess: () => {
        navigate('/login', { replace: true, state: { registered: false, resetComplete: true } });
      },
      onError: (error) => {
        const info = error as ApiErrorInfo;
        setSubmitError(info.message || 'Could not reset your password. The link may have expired.');
      },
    });
  }

  return (
    <AuthLayout title="Reset password" subtitle="Choose a new password for your account.">
      {!token && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No reset token found in the link. Please use the link from your email, or request a new one.
        </Alert>
      )}
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }} data-testid="reset-confirm-error">
          {submitError}
        </Alert>
      )}
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
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
          <Button type="submit" variant="contained" size="large" disabled={mutation.isPending} fullWidth>
            {mutation.isPending ? 'Resetting…' : 'Reset password'}
          </Button>
        </Stack>
      </Box>
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Link component={RouterLink} to="/login" variant="body2">
          Back to sign in
        </Link>
      </Box>
    </AuthLayout>
  );
}

export default ResetPasswordPage;

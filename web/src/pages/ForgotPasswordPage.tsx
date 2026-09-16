import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { AuthLayout } from '@/components/AuthLayout';
import { requestPasswordReset } from '@/api/authApi';
import { isValidEmail } from '@/utils/validation';

const GENERIC_MESSAGE = 'If an account exists for that email, a password reset link has been sent. Check your inbox.';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: requestPasswordReset,
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }
    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address');
      return;
    }
    setEmailError(null);

    // Intentionally shows the same generic message regardless of the outcome
    // (mirrors auth-service's no-account-enumeration behavior).
    mutation.mutate(email.trim(), {
      onSettled: () => setSubmitted(true),
    });
  }

  return (
    <AuthLayout title="Forgot password" subtitle="We'll email you a link to reset it.">
      {submitted ? (
        <Alert severity="info" data-testid="reset-request-message">
          {GENERIC_MESSAGE}
        </Alert>
      ) : (
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={Boolean(emailError)}
              helperText={emailError}
              autoComplete="email"
              fullWidth
              required
            />
            <Button type="submit" variant="contained" size="large" disabled={mutation.isPending} fullWidth>
              {mutation.isPending ? 'Sending…' : 'Send reset link'}
            </Button>
          </Stack>
        </Box>
      )}
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Link component={RouterLink} to="/login" variant="body2">
          Back to sign in
        </Link>
      </Box>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;

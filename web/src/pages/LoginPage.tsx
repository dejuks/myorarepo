import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AuthLayout } from '@/components/AuthLayout';
import { useAppDispatch } from '@/app/hooks';
import { login as loginRequest, resendVerificationEmail } from '@/api/authApi';
import { credentialsReceived } from '@/features/auth/authSlice';
import { isValidEmail } from '@/utils/validation';
import type { ApiErrorInfo } from '@/types/api';

interface LocationState {
  from?: { pathname: string };
  registered?: boolean;
}

/** Matches auth-service's assertAccountIsUsable message for PENDING_VERIFICATION, without hardcoding the whole sentence. */
function looksLikeUnverifiedEmailError(message: string | undefined): boolean {
  return Boolean(message?.toLowerCase().includes('verify your email'));
}

interface FieldErrors {
  email?: string;
  password?: string;
}

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState | null) ?? null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resendSent, setResendSent] = useState(false);

  const mutation = useMutation({
    mutationFn: loginRequest,
  });
  const resendMutation = useMutation({
    mutationFn: () => resendVerificationEmail(email.trim()),
  });

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      errors.email = 'Enter a valid email address';
    }
    if (!password) {
      errors.password = 'Password is required';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleResend() {
    setResendSent(false);
    resendMutation.mutate(undefined, { onSuccess: () => setResendSent(true) });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    setResendSent(false);
    if (!validate()) return;

    mutation.mutate(
      { email: email.trim(), password },
      {
        onSuccess: (tokens) => {
          dispatch(credentialsReceived(tokens));
          const destination = state?.from?.pathname ?? '/dashboard';
          navigate(destination, { replace: true });
        },
        onError: (error) => {
          const info = error as ApiErrorInfo;
          setSubmitError(info.message || 'Login failed. Please try again.');
        },
      },
    );
  }

  return (
    <AuthLayout title="Sign in" subtitle="Welcome back — sign in to continue.">
      {state?.registered && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Account created. Check your email for a verification link before signing in.
        </Alert>
      )}
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }} data-testid="login-error">
          {submitError}
          {looksLikeUnverifiedEmailError(submitError) && (
            <Box sx={{ mt: 1 }}>
              {resendSent ? (
                <Typography variant="body2" data-testid="resend-verification-sent">
                  If that email has a pending, unverified account, a new verification link has been sent.
                </Typography>
              ) : (
                <Link component="button" type="button" variant="body2" onClick={handleResend} data-testid="resend-verification-link">
                  {resendMutation.isPending ? 'Sending…' : 'Resend verification email'}
                </Link>
              )}
            </Box>
          )}
        </Alert>
      )}
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={Boolean(fieldErrors.email)}
            helperText={fieldErrors.email}
            autoComplete="email"
            fullWidth
            required
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={Boolean(fieldErrors.password)}
            helperText={fieldErrors.password}
            autoComplete="current-password"
            fullWidth
            required
          />
          <Box sx={{ textAlign: 'right' }}>
            <Link component={RouterLink} to="/forgot-password" variant="body2">
              Forgot password?
            </Link>
          </Box>
          <Button type="submit" variant="contained" size="large" disabled={mutation.isPending} fullWidth>
            {mutation.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
          <Typography variant="body2" textAlign="center">
            Don&apos;t have an account?{' '}
            <Link component={RouterLink} to="/register">
              Create one
            </Link>
          </Typography>
        </Stack>
      </Box>
    </AuthLayout>
  );
}

export default LoginPage;

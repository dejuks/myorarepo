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
import { login as loginRequest } from '@/api/authApi';
import { credentialsReceived } from '@/features/auth/authSlice';
import { isValidEmail } from '@/utils/validation';
import type { ApiErrorInfo } from '@/types/api';

interface LocationState {
  from?: { pathname: string };
  registered?: boolean;
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

  const mutation = useMutation({
    mutationFn: loginRequest,
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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
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
          Account created. Sign in with your new credentials.
        </Alert>
      )}
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }} data-testid="login-error">
          {submitError}
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

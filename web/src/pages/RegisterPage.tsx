import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AuthLayout } from '@/components/AuthLayout';
import { PasswordPolicyHint } from '@/components/PasswordPolicyHint';
import { createUserProfile, registerCredentials } from '@/api/authApi';
import { checkPasswordPolicy, isValidEmail, passwordPolicyMessage } from '@/utils/validation';
import type { ApiErrorInfo } from '@/types/api';

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function RegisterPage() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [partialAccountWarning, setPartialAccountWarning] = useState(false);

  const registerMutation = useMutation({
    mutationFn: async () => {
      const userId = uuidv4();
      // Step 1: create the profile in user-service.
      await createUserProfile({ id: userId, email: email.trim(), firstName: firstName.trim(), lastName: lastName.trim() });
      // Step 2: create login credentials in auth-service for the same userId.
      try {
        await registerCredentials({ userId, email: email.trim(), password });
      } catch (credentialsError) {
        // The profile now exists without credentials — a real, visible edge case.
        // Don't silently retry; surface it clearly instead of a generic failure.
        setPartialAccountWarning(true);
        throw credentialsError;
      }
    },
  });

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!firstName.trim()) errors.firstName = 'First name is required';
    if (!lastName.trim()) errors.lastName = 'Last name is required';
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      errors.email = 'Enter a valid email address';
    }
    if (!password) {
      errors.password = 'Password is required';
    } else if (!checkPasswordPolicy(password).isValid) {
      errors.password = passwordPolicyMessage();
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (confirmPassword !== password) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    setPartialAccountWarning(false);
    if (!validate()) return;

    registerMutation.mutate(undefined, {
      onSuccess: () => {
        navigate('/login', { replace: true, state: { registered: true } });
      },
      onError: (error) => {
        const info = error as ApiErrorInfo;
        setSubmitError(info.message || 'Registration failed. Please try again.');
      },
    });
  }

  return (
    <AuthLayout title="Create an account" subtitle="Join the ORA scholarly platform.">
      {partialAccountWarning && (
        <Alert severity="warning" sx={{ mb: 2 }} data-testid="partial-account-warning">
          Your account profile was created, but registration didn&apos;t finish — please contact support with
          the email address you used so we can finish setting up your login.
        </Alert>
      )}
      {submitError && !partialAccountWarning && (
        <Alert severity="error" sx={{ mb: 2 }} data-testid="register-error">
          {submitError}
        </Alert>
      )}
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              error={Boolean(fieldErrors.firstName)}
              helperText={fieldErrors.firstName}
              fullWidth
              required
            />
            <TextField
              label="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              error={Boolean(fieldErrors.lastName)}
              helperText={fieldErrors.lastName}
              fullWidth
              required
            />
          </Stack>
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
            autoComplete="new-password"
            fullWidth
            required
          />
          <PasswordPolicyHint password={password} />
          <TextField
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={Boolean(fieldErrors.confirmPassword)}
            helperText={fieldErrors.confirmPassword}
            autoComplete="new-password"
            fullWidth
            required
          />
          <Button type="submit" variant="contained" size="large" disabled={registerMutation.isPending} fullWidth>
            {registerMutation.isPending ? 'Creating account…' : 'Create account'}
          </Button>
          <Typography variant="body2" textAlign="center">
            Already have an account?{' '}
            <Link component={RouterLink} to="/login">
              Sign in
            </Link>
          </Typography>
        </Stack>
      </Box>
    </AuthLayout>
  );
}

export default RegisterPage;

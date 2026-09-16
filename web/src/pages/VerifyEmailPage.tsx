import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AuthLayout } from '@/components/AuthLayout';
import { verifyEmail, resendVerificationEmail } from '@/api/authApi';
import { isValidEmail } from '@/utils/validation';
import type { ApiErrorInfo } from '@/types/api';

/**
 * Reached from the link in the verification email (`{FRONTEND_URL}/verify-email?token=...`,
 * see services/auth-service/README.md "Email verification"). Deliberately NOT nested under
 * PublicRoute or ProtectedRoute — someone already signed in under a different account should
 * still be able to verify a second one from the same browser, and PublicRoute would otherwise
 * bounce an authenticated visitor straight to /dashboard before the token is ever submitted.
 */
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const attempted = useRef(false);

  const [resendEmail, setResendEmail] = useState('');
  const [resendSent, setResendSent] = useState(false);

  const verifyMutation = useMutation({ mutationFn: () => verifyEmail(token) });
  const resendMutation = useMutation({ mutationFn: () => resendVerificationEmail(resendEmail.trim()) });

  useEffect(() => {
    if (token && !attempted.current) {
      attempted.current = true;
      verifyMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function handleResend() {
    if (!isValidEmail(resendEmail)) return;
    setResendSent(false);
    resendMutation.mutate(undefined, { onSuccess: () => setResendSent(true) });
  }

  const errorMessage = verifyMutation.isError ? (verifyMutation.error as ApiErrorInfo).message || 'This verification link is invalid or has expired.' : null;

  return (
    <AuthLayout title="Verify your email" subtitle="Confirming your account.">
      {!token && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No verification token found in the link. Please use the link from your email.
        </Alert>
      )}

      {token && verifyMutation.isPending && (
        <Box display="flex" justifyContent="center" alignItems="center" sx={{ py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {verifyMutation.isSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} data-testid="verify-success">
          Your email is verified — you can now log in.
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }} data-testid="verify-error">
          {errorMessage}
        </Alert>
      )}

      {verifyMutation.isSuccess ? (
        <Button component={RouterLink} to="/login" variant="contained" size="large" fullWidth>
          Go to sign in
        </Button>
      ) : (
        (errorMessage || !token) && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Link expired or already used? Request a new one below.
            </Typography>
            {resendSent && (
              <Alert severity="info">If that email has a pending, unverified account, a new verification link has been sent.</Alert>
            )}
            <TextField
              label="Email"
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              autoComplete="email"
              fullWidth
            />
            <Button
              variant="outlined"
              onClick={handleResend}
              disabled={!isValidEmail(resendEmail) || resendMutation.isPending}
              fullWidth
            >
              {resendMutation.isPending ? 'Sending…' : 'Resend verification email'}
            </Button>
          </Stack>
        )
      )}

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Link component={RouterLink} to="/login" variant="body2">
          Back to sign in
        </Link>
      </Box>
    </AuthLayout>
  );
}

export default VerifyEmailPage;

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { PasswordPolicyHint } from '@/components/PasswordPolicyHint';
import { createUserProfile, registerCredentials } from '@/api/authApi';
import { checkPasswordPolicy, isValidEmail, passwordPolicyMessage } from '@/utils/validation';
import type { ApiErrorInfo } from '@/types/api';
import type { User } from '@/types/domain';

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called once the account is fully created (both steps succeeded). The dialog closes itself before this fires. */
  onCreated: (user: User) => void;
  /**
   * Short phrase describing where this account will be usable, shown under
   * the dialog title — e.g. "in Journals" from a module dashboard. Omit for
   * the platform-wide admin Users page, where the default copy already
   * says "across the whole platform".
   */
  scopeLabel?: string;
}

/**
 * Shared by the global Admin → Users page (super admin only) and every
 * module's own Roles dashboard ("module admin" — that module's own top
 * role, or platform ADMIN — see docs/01-architecture.md §2a "Platform-wide
 * ADMIN override..."). Both call sites gate WHO can open this dialog via
 * their own route guard (AdminRoute / ModuleRoute) — this component itself
 * does not re-check permissions, since the account-creation endpoints it
 * calls (POST /users, POST /auth/register) are the same public two-step
 * flow the self-registration page uses.
 *
 * Creates a REAL platform account, usable everywhere — not a module-scoped
 * one, since no module service stores user profiles — via the identical
 * flow RegisterPage.tsx uses. Whether the created account starts ACTIVE or
 * PENDING_VERIFICATION (and so needs its owner to click an emailed link
 * before logging in) is a platform-wide runtime setting, not something this
 * dialog controls or can see — see PlatformSettingsPage.tsx /
 * services/auth-service/README.md "Email verification".
 */
export function CreateUserDialog({ open, onClose, onCreated, scopeLabel }: CreateUserDialogProps) {
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [partialAccountWarning, setPartialAccountWarning] = useState(false);

  useEffect(() => {
    if (open) {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFieldErrors({});
      setSubmitError(null);
      setPartialAccountWarning(false);
    }
  }, [open]);

  const createUserMutation = useMutation({
    mutationFn: async (): Promise<User> => {
      const userId = uuidv4();
      const profile = await createUserProfile({ id: userId, email: email.trim(), firstName: firstName.trim(), lastName: lastName.trim() });
      try {
        await registerCredentials({ userId, email: email.trim(), password });
      } catch (credentialsError) {
        setPartialAccountWarning(true);
        throw credentialsError;
      }
      return profile;
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
      errors.confirmPassword = 'Please confirm the password';
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

    createUserMutation.mutate(undefined, {
      onSuccess: (createdUser) => {
        queryClient.invalidateQueries({ queryKey: ['users'] });
        onClose();
        onCreated(createdUser);
      },
      onError: (error) => {
        const info = error as ApiErrorInfo;
        setSubmitError(info.message || 'Could not create this account.');
      },
    });
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Create a platform user</DialogTitle>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              This creates a real ORA account, usable {scopeLabel ? scopeLabel : 'across the whole platform'} — not
              just here. Depending on the platform&apos;s email-verification setting (Administration → Settings), they
              may need to click a link emailed to them before they can log in.
            </Typography>
            {partialAccountWarning && (
              <Alert severity="warning">
                The account profile was created, but credentials setup didn&apos;t finish — please try again or
                contact support before assigning this person a role.
              </Alert>
            )}
            {submitError && !partialAccountWarning && <Alert severity="error">{submitError}</Alert>}
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={createUserMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={createUserMutation.isPending}>
            {createUserMutation.isPending ? 'Creating…' : 'Create account'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export default CreateUserDialog;

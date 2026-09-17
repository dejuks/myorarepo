import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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

export interface CreateUserFormProps {
  /** Called once the account is fully created (both steps succeeded). */
  onCreated: (user: User) => void;
  onCancel: () => void;
  /**
   * Short phrase describing where this account will be usable, shown under
   * the intro copy — e.g. "in Journals" from a module dashboard. Omit for
   * the platform-wide admin Users page, where the default copy already
   * says "across the whole platform".
   */
  scopeLabel?: string;
  submitLabel?: string;
  cancelLabel?: string;
}

/**
 * The actual create-user form — fields, validation, and the two-step
 * create-profile-then-register-credentials mutation. Deliberately
 * layout-agnostic (no Dialog/page chrome of its own) so it can be dropped
 * into either a compact modal (CreateUserDialog, still used by each
 * module's own Roles dashboard) or a full page (CreateUserPage, used by
 * the platform-wide Admin → Users screen) without duplicating this logic.
 *
 * Creates a REAL platform account, usable everywhere — not a module-scoped
 * one, since no module service stores user profiles — via the identical
 * flow RegisterPage.tsx uses. Whether the created account starts ACTIVE or
 * PENDING_VERIFICATION (and so needs its owner to click an emailed link
 * before logging in) is a platform-wide runtime setting, not something
 * this form controls or can see — see PlatformSettingsPage.tsx /
 * services/auth-service/README.md "Email verification".
 */
export function CreateUserForm({ onCreated, onCancel, scopeLabel, submitLabel, cancelLabel }: CreateUserFormProps) {
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [partialAccountWarning, setPartialAccountWarning] = useState(false);

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
        onCreated(createdUser);
      },
      onError: (error) => {
        const info = error as ApiErrorInfo;
        setSubmitError(info.message || 'Could not create this account.');
      },
    });
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          This creates a real ORA account, usable {scopeLabel ? scopeLabel : 'across the whole platform'} — not just
          here. Depending on the platform&apos;s email-verification setting (Administration → Settings), they may
          need to click a link emailed to them before they can log in.
        </Typography>
        {partialAccountWarning && (
          <Alert severity="warning">
            The account profile was created, but credentials setup didn&apos;t finish — please try again or contact
            support before assigning this person a role.
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
        <Stack direction="row" spacing={2}>
          <Button type="submit" variant="contained" disabled={createUserMutation.isPending}>
            {createUserMutation.isPending ? 'Creating…' : submitLabel || 'Create account'}
          </Button>
          <Button variant="text" onClick={onCancel} disabled={createUserMutation.isPending}>
            {cancelLabel || 'Cancel'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

export default CreateUserForm;

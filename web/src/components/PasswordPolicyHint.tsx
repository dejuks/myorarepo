import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { checkPasswordPolicy } from '@/utils/validation';

interface RuleRowProps {
  met: boolean;
  label: string;
}

function RuleRow({ met, label }: RuleRowProps) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      {met ? (
        <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
      ) : (
        <RadioButtonUncheckedIcon color="disabled" sx={{ fontSize: 16 }} />
      )}
      <Typography variant="caption" color={met ? 'text.secondary' : 'text.secondary'}>
        {label}
      </Typography>
    </Stack>
  );
}

export function PasswordPolicyHint({ password }: { password: string }) {
  const policy = checkPasswordPolicy(password);
  return (
    <Box sx={{ mt: 0.5, mb: 1 }} data-testid="password-policy-hint">
      <Stack spacing={0.25}>
        <RuleRow met={policy.hasValidLength} label="8-72 characters" />
        <RuleRow met={policy.hasUpper} label="One uppercase letter" />
        <RuleRow met={policy.hasLower} label="One lowercase letter" />
        <RuleRow met={policy.hasDigit} label="One digit" />
        <RuleRow met={policy.hasSpecial} label="One special character" />
      </Stack>
    </Box>
  );
}

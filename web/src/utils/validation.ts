/** Mirrors the backend policy in RegisterDto/ResetPasswordDto (class-validator @Matches). */
export const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).*$/;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export interface PasswordPolicyCheck {
  hasLower: boolean;
  hasUpper: boolean;
  hasDigit: boolean;
  hasSpecial: boolean;
  hasMinLength: boolean;
  hasValidLength: boolean;
  isValid: boolean;
}

export function checkPasswordPolicy(password: string): PasswordPolicyCheck {
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const hasMinLength = password.length >= PASSWORD_MIN_LENGTH;
  const hasValidLength = password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH;

  return {
    hasLower,
    hasUpper,
    hasDigit,
    hasSpecial,
    hasMinLength,
    hasValidLength,
    isValid: hasLower && hasUpper && hasDigit && hasSpecial && hasValidLength,
  };
}

export function passwordPolicyMessage(): string {
  return 'Password must be 8-72 characters and include uppercase, lowercase, a digit, and a special character.';
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/** Mirrors the backend policy in CreateRoleDto (class-validator @Matches). */
export const ROLE_NAME_REGEX = /^[A-Za-z_]+$/;
export const ROLE_NAME_MIN_LENGTH = 2;
export const ROLE_NAME_MAX_LENGTH = 50;

export function isValidRoleName(name: string): boolean {
  return (
    name.length >= ROLE_NAME_MIN_LENGTH && name.length <= ROLE_NAME_MAX_LENGTH && ROLE_NAME_REGEX.test(name)
  );
}

export function roleNameMessage(): string {
  return 'Role name must be 2-50 characters and contain only letters and underscores.';
}

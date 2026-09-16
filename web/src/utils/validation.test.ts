import { describe, expect, it } from 'vitest';
import { checkPasswordPolicy, isValidEmail, PASSWORD_POLICY_REGEX } from '@/utils/validation';

describe('checkPasswordPolicy', () => {
  it('rejects a password missing every rule', () => {
    const result = checkPasswordPolicy('');
    expect(result.isValid).toBe(false);
    expect(result.hasLower).toBe(false);
    expect(result.hasUpper).toBe(false);
    expect(result.hasDigit).toBe(false);
    expect(result.hasSpecial).toBe(false);
  });

  it('rejects a password missing an uppercase letter', () => {
    expect(checkPasswordPolicy('lowercase1!').isValid).toBe(false);
  });

  it('rejects a password missing a digit', () => {
    expect(checkPasswordPolicy('NoDigitsHere!').isValid).toBe(false);
  });

  it('rejects a password missing a special character', () => {
    expect(checkPasswordPolicy('NoSpecial123').isValid).toBe(false);
  });

  it('rejects a password shorter than 8 characters', () => {
    expect(checkPasswordPolicy('Sh0rt!').isValid).toBe(false);
  });

  it('rejects a password longer than 72 characters', () => {
    const tooLong = `Aa1!${'x'.repeat(70)}`;
    expect(tooLong.length).toBeGreaterThan(72);
    expect(checkPasswordPolicy(tooLong).isValid).toBe(false);
  });

  it('accepts a password satisfying every rule', () => {
    const result = checkPasswordPolicy('StrongPass1!');
    expect(result.isValid).toBe(true);
    expect(PASSWORD_POLICY_REGEX.test('StrongPass1!')).toBe(true);
  });
});

describe('isValidEmail', () => {
  it('accepts a plausible email', () => {
    expect(isValidEmail('jane@example.com')).toBe(true);
  });

  it('rejects a string with no @', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
  });

  it('rejects a string with no domain', () => {
    expect(isValidEmail('jane@')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});

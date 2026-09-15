import { hashPassword, comparePassword, isStrongPassword } from '@common/utils/password.util';

describe('password.util', () => {
  it('hashes a password and can verify it against the original', async () => {
    const hash = await hashPassword('MySecret1!');
    expect(hash).not.toBe('MySecret1!');
    await expect(comparePassword('MySecret1!', hash)).resolves.toBe(true);
    await expect(comparePassword('WrongSecret1!', hash)).resolves.toBe(false);
  });

  it.each([
    ['Short1!', false],
    ['alllowercase1!', false],
    ['ALLUPPERCASE1!', false],
    ['NoDigitsHere!', false],
    ['NoSpecialChar1', false],
    ['ValidPass1!', true],
  ])('validates password strength for "%s" -> %s', (password, expected) => {
    expect(isStrongPassword(password)).toBe(expected);
  });
});

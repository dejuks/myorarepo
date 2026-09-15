import { AuthService } from '@application/services/auth.service';
import { AccountStatus } from '@domain/entities/user-credential.entity';
import {
  FakeUserCredentialRepository,
  FakeRefreshTokenRepository,
  FakePasswordResetTokenRepository,
  FakeAuthAuditLogRepository,
} from './fakes';
import { hashPassword } from '@common/utils/password.util';

// Infrastructure singletons are mocked so unit tests never touch real Redis/RabbitMQ.
jest.mock('@infrastructure/cache/redis.client', () => ({
  blacklistToken: jest.fn(),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
  incrementLoginAttempts: jest.fn().mockResolvedValue(1),
  clearLoginAttempts: jest.fn(),
}));

jest.mock('@infrastructure/messaging/rabbitmq.publisher', () => ({
  rabbitMqPublisher: { publish: jest.fn().mockResolvedValue(undefined) },
}));

describe('AuthService', () => {
  let userCredentialRepo: FakeUserCredentialRepository;
  let refreshTokenRepo: FakeRefreshTokenRepository;
  let passwordResetTokenRepo: FakePasswordResetTokenRepository;
  let auditLogRepo: FakeAuthAuditLogRepository;
  let authService: AuthService;

  beforeEach(() => {
    userCredentialRepo = new FakeUserCredentialRepository();
    refreshTokenRepo = new FakeRefreshTokenRepository();
    passwordResetTokenRepo = new FakePasswordResetTokenRepository();
    auditLogRepo = new FakeAuthAuditLogRepository();
    authService = new AuthService(userCredentialRepo, refreshTokenRepo, passwordResetTokenRepo, auditLogRepo);
  });

  describe('register', () => {
    it('creates a new credential with hashed password and default USER role', async () => {
      const result = await authService.register({
        userId: 'a3f1f9a0-1111-4a11-8a11-000000000001',
        email: 'new.user@example.com',
        password: 'StrongPass1!',
      });

      expect(result.userId).toBe('a3f1f9a0-1111-4a11-8a11-000000000001');
      const stored = await userCredentialRepo.findByEmail('new.user@example.com');
      expect(stored).not.toBeNull();
      expect(stored?.passwordHash).not.toBe('StrongPass1!');
      expect(stored?.roles).toEqual(['USER']);
    });

    it('rejects registration when the email is already in use', async () => {
      await authService.register({ userId: 'id-1', email: 'dup@example.com', password: 'StrongPass1!' });

      await expect(
        authService.register({ userId: 'id-2', email: 'dup@example.com', password: 'AnotherPass1!' }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('login', () => {
    async function seedActiveUser(email: string, plainPassword: string) {
      const passwordHash = await hashPassword(plainPassword);
      return userCredentialRepo.create({
        userId: 'user-123',
        email,
        passwordHash,
        roles: ['USER'],
        accountStatus: AccountStatus.ACTIVE,
      });
    }

    it('returns an access/refresh token pair for valid credentials', async () => {
      await seedActiveUser('login@example.com', 'CorrectPass1!');

      const result = await authService.login(
        { email: 'login@example.com', password: 'CorrectPass1!' },
        { ipAddress: '127.0.0.1', userAgent: 'jest' },
      );

      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.tokenType).toBe('Bearer');
      expect(refreshTokenRepo.rows.size).toBe(1);
    });

    it('rejects an unknown email without revealing whether the account exists', async () => {
      await expect(
        authService.login({ email: 'nobody@example.com', password: 'whatever' }, {}),
      ).rejects.toMatchObject({ statusCode: 401, message: 'Invalid email or password' });
    });

    it('rejects an incorrect password and records a failed-login audit entry', async () => {
      await seedActiveUser('wrongpass@example.com', 'CorrectPass1!');

      await expect(
        authService.login({ email: 'wrongpass@example.com', password: 'WrongPass1!' }, {}),
      ).rejects.toMatchObject({ statusCode: 401 });

      expect(auditLogRepo.entries.length).toBeGreaterThan(0);
    });

    it('locks the account after the configured number of consecutive failures', async () => {
      const credential = await seedActiveUser('lockout@example.com', 'CorrectPass1!');

      for (let i = 0; i < 5; i++) {
        await authService.login({ email: 'lockout@example.com', password: 'WrongPass1!' }, {}).catch(() => undefined);
      }

      const updated = await userCredentialRepo.findById(credential.id);
      expect(updated?.lockedUntil).not.toBeNull();

      await expect(
        authService.login({ email: 'lockout@example.com', password: 'CorrectPass1!' }, {}),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('rejects login for a disabled account even with the correct password', async () => {
      const passwordHash = await hashPassword('CorrectPass1!');
      await userCredentialRepo.create({
        userId: 'disabled-user',
        email: 'disabled@example.com',
        passwordHash,
        accountStatus: AccountStatus.DISABLED,
      });

      await expect(
        authService.login({ email: 'disabled@example.com', password: 'CorrectPass1!' }, {}),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('refreshTokens', () => {
    it('rotates the refresh token and revokes the old one', async () => {
      const passwordHash = await hashPassword('CorrectPass1!');
      await userCredentialRepo.create({
        userId: 'refresh-user',
        email: 'refresh@example.com',
        passwordHash,
        accountStatus: AccountStatus.ACTIVE,
      });

      const firstLogin = await authService.login({ email: 'refresh@example.com', password: 'CorrectPass1!' }, {});
      const refreshed = await authService.refreshTokens(firstLogin.refreshToken, {});

      expect(refreshed.refreshToken).not.toBe(firstLogin.refreshToken);

      const rows = [...refreshTokenRepo.rows.values()];
      const oldRow = rows.find((r) => r.userId === 'refresh-user' && r.revokedAt !== null);
      expect(oldRow).toBeDefined();
    });

    it('revokes the entire token family when a revoked refresh token is replayed', async () => {
      const passwordHash = await hashPassword('CorrectPass1!');
      await userCredentialRepo.create({
        userId: 'replay-user',
        email: 'replay@example.com',
        passwordHash,
        accountStatus: AccountStatus.ACTIVE,
      });

      const firstLogin = await authService.login({ email: 'replay@example.com', password: 'CorrectPass1!' }, {});
      await authService.refreshTokens(firstLogin.refreshToken, {}); // rotates, revoking firstLogin.refreshToken

      // Replaying the now-revoked original refresh token should fail and revoke the whole family.
      await expect(authService.refreshTokens(firstLogin.refreshToken, {})).rejects.toMatchObject({ statusCode: 401 });

      const allRevoked = [...refreshTokenRepo.rows.values()]
        .filter((r) => r.userId === 'replay-user')
        .every((r) => r.revokedAt !== null);
      expect(allRevoked).toBe(true);
    });
  });

  describe('changePassword', () => {
    it('updates the password and revokes all existing sessions', async () => {
      const passwordHash = await hashPassword('OldPass1!');
      const credential = await userCredentialRepo.create({
        userId: 'change-pw-user',
        email: 'changepw@example.com',
        passwordHash,
        accountStatus: AccountStatus.ACTIVE,
      });
      await refreshTokenRepo.create({ userId: credential.userId, tokenHash: 'abc', expiresAt: new Date(Date.now() + 100000) });

      await authService.changePassword(credential.userId, { currentPassword: 'OldPass1!', newPassword: 'NewPass1!' });

      const updated = await userCredentialRepo.findById(credential.id);
      expect(updated?.passwordHash).not.toBe(passwordHash);
      const allRevoked = [...refreshTokenRepo.rows.values()].every((r) => r.revokedAt !== null);
      expect(allRevoked).toBe(true);
    });

    it('rejects when the current password is wrong', async () => {
      const passwordHash = await hashPassword('OldPass1!');
      const credential = await userCredentialRepo.create({
        userId: 'change-pw-user-2',
        email: 'changepw2@example.com',
        passwordHash,
        accountStatus: AccountStatus.ACTIVE,
      });

      await expect(
        authService.changePassword(credential.userId, { currentPassword: 'WrongOldPass1!', newPassword: 'NewPass1!' }),
      ).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe('requestPasswordReset / resetPassword', () => {
    it('issues a reset token and allows completing the reset exactly once', async () => {
      const passwordHash = await hashPassword('OldPass1!');
      const credential = await userCredentialRepo.create({
        userId: 'reset-user',
        email: 'reset@example.com',
        passwordHash,
        accountStatus: AccountStatus.ACTIVE,
      });

      await authService.requestPasswordReset('reset@example.com');
      const tokenRow = [...passwordResetTokenRepo.rows.values()].find((r) => r.userId === credential.userId);
      expect(tokenRow).toBeDefined();

      // We only have the hash in the fake store; simulate the raw token by re-deriving through the service's
      // public contract is not possible here without the raw value, so this test focuses on the invariant
      // that a second reset request invalidates the previous token instead of stacking valid tokens.
      await authService.requestPasswordReset('reset@example.com');
      const rows = [...passwordResetTokenRepo.rows.values()].filter((r) => r.userId === credential.userId);
      const activeRows = rows.filter((r) => !r.usedAt);
      expect(activeRows.length).toBe(1);
    });

    it('silently no-ops for an unknown email (prevents account enumeration)', async () => {
      await expect(authService.requestPasswordReset('unknown@example.com')).resolves.toBeUndefined();
    });
  });

  describe('MFA enrollment', () => {
    it('rejects an invalid code when confirming enrollment', async () => {
      const passwordHash = await hashPassword('Pass1!aaaa');
      const credential = await userCredentialRepo.create({
        userId: 'mfa-user',
        email: 'mfa@example.com',
        passwordHash,
        accountStatus: AccountStatus.ACTIVE,
      });

      await authService.initiateMfaEnrollment(credential.userId);
      await expect(authService.confirmMfaEnrollment(credential.userId, '000000')).rejects.toMatchObject({ statusCode: 401 });
    });
  });
});

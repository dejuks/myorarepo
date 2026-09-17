import { AuthService } from '@application/services/auth.service';
import { AccountStatus } from '@domain/entities/user-credential.entity';
import {
  FakeUserCredentialRepository,
  FakeRefreshTokenRepository,
  FakePasswordResetTokenRepository,
  FakeEmailVerificationTokenRepository,
  FakePlatformSettingsRepository,
  FakeAuthAuditLogRepository,
} from './fakes';
import { rabbitMqPublisher } from '@infrastructure/messaging/rabbitmq.publisher';

jest.mock('@infrastructure/cache/redis.client', () => ({
  blacklistToken: jest.fn(),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
  incrementLoginAttempts: jest.fn().mockResolvedValue(1),
  clearLoginAttempts: jest.fn(),
}));

jest.mock('@infrastructure/messaging/rabbitmq.publisher', () => ({
  rabbitMqPublisher: { publish: jest.fn().mockResolvedValue(undefined) },
}));

// This is the platform_settings.require_email_verification=false path — reachable either as
// a fresh install's seeded default, or because a super-admin flipped it at runtime via
// PATCH /auth/settings (see auth.service.spec.ts's "platform settings" describe block for
// that toggle itself). AuthService reads the setting through IPlatformSettingsRepository, not
// an env var, so this fake is all that's needed to exercise it in isolation.
describe('AuthService.register with platform_settings.require_email_verification = false', () => {
  let userCredentialRepo: FakeUserCredentialRepository;
  let refreshTokenRepo: FakeRefreshTokenRepository;
  let passwordResetTokenRepo: FakePasswordResetTokenRepository;
  let emailVerificationTokenRepo: FakeEmailVerificationTokenRepository;
  let platformSettingsRepo: FakePlatformSettingsRepository;
  let auditLogRepo: FakeAuthAuditLogRepository;
  let authService: AuthService;

  beforeEach(() => {
    userCredentialRepo = new FakeUserCredentialRepository();
    refreshTokenRepo = new FakeRefreshTokenRepository();
    passwordResetTokenRepo = new FakePasswordResetTokenRepository();
    emailVerificationTokenRepo = new FakeEmailVerificationTokenRepository();
    platformSettingsRepo = new FakePlatformSettingsRepository(false);
    auditLogRepo = new FakeAuthAuditLogRepository();
    authService = new AuthService(
      userCredentialRepo,
      refreshTokenRepo,
      passwordResetTokenRepo,
      emailVerificationTokenRepo,
      platformSettingsRepo,
      auditLogRepo,
    );
  });

  it('creates the account ACTIVE immediately, with no verification token issued or email sent', async () => {
    await authService.register({ userId: 'skip-1', email: 'skip1@example.com', password: 'StrongPass1!' });

    const stored = await userCredentialRepo.findByEmail('skip1@example.com');
    expect(stored?.accountStatus).toBe(AccountStatus.ACTIVE);
    expect(stored?.emailVerifiedAt).not.toBeNull();
    expect(emailVerificationTokenRepo.rows.size).toBe(0);

    const publishedEventTypes = (rabbitMqPublisher.publish as jest.Mock).mock.calls.map(([eventType]) => eventType);
    expect(publishedEventTypes).toContain('auth.registered');
    expect(publishedEventTypes).toContain('auth.email_verification.completed');
    expect(publishedEventTypes).not.toContain('auth.email_verification.requested');
  });

  it('lets the newly registered account log in immediately, with no verification step', async () => {
    await authService.register({ userId: 'skip-2', email: 'skip2@example.com', password: 'StrongPass1!' });

    const tokens = await authService.login({ email: 'skip2@example.com', password: 'StrongPass1!' }, {});
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
  });

  it('resumes requiring verification for new registrations as soon as the setting is flipped back on', async () => {
    await authService.updatePlatformSettings({ requireEmailVerification: true }, 'admin-user');

    await authService.register({ userId: 'skip-3', email: 'skip3@example.com', password: 'StrongPass1!' });

    const stored = await userCredentialRepo.findByEmail('skip3@example.com');
    expect(stored?.accountStatus).toBe(AccountStatus.PENDING_VERIFICATION);
    await expect(authService.login({ email: 'skip3@example.com', password: 'StrongPass1!' }, {})).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});

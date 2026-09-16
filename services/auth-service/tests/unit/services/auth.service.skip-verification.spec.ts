// Isolated from auth.service.spec.ts because it needs REQUIRE_EMAIL_VERIFICATION=false
// set BEFORE @config/env is first imported (envalid reads process.env once, at module
// load time) — keeping it in its own file means the rest of the suite is unaffected and
// keeps exercising the production-correct REQUIRE_EMAIL_VERIFICATION=true default.
process.env.REQUIRE_EMAIL_VERIFICATION = 'false';

import { AuthService } from '@application/services/auth.service';
import { AccountStatus } from '@domain/entities/user-credential.entity';
import {
  FakeUserCredentialRepository,
  FakeRefreshTokenRepository,
  FakePasswordResetTokenRepository,
  FakeEmailVerificationTokenRepository,
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

describe('AuthService.register with REQUIRE_EMAIL_VERIFICATION=false (dev/local shortcut)', () => {
  let userCredentialRepo: FakeUserCredentialRepository;
  let refreshTokenRepo: FakeRefreshTokenRepository;
  let passwordResetTokenRepo: FakePasswordResetTokenRepository;
  let emailVerificationTokenRepo: FakeEmailVerificationTokenRepository;
  let auditLogRepo: FakeAuthAuditLogRepository;
  let authService: AuthService;

  beforeEach(() => {
    userCredentialRepo = new FakeUserCredentialRepository();
    refreshTokenRepo = new FakeRefreshTokenRepository();
    passwordResetTokenRepo = new FakePasswordResetTokenRepository();
    emailVerificationTokenRepo = new FakeEmailVerificationTokenRepository();
    auditLogRepo = new FakeAuthAuditLogRepository();
    authService = new AuthService(userCredentialRepo, refreshTokenRepo, passwordResetTokenRepo, emailVerificationTokenRepo, auditLogRepo);
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
});

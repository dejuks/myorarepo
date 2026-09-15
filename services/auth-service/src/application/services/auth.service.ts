import { authenticator } from 'otplib';
import { IUserCredentialRepository } from '@domain/repositories/user-credential.repository.interface';
import { IRefreshTokenRepository } from '@domain/repositories/refresh-token.repository.interface';
import { IPasswordResetTokenRepository } from '@domain/repositories/password-reset-token.repository.interface';
import { IAuthAuditLogRepository } from '@domain/repositories/auth-audit-log.repository.interface';
import { AccountStatus } from '@domain/entities/user-credential.entity';
import { AuthAuditEventType } from '@domain/entities/auth-audit-log.entity';
import { RegisterDto } from '@application/dto/register.dto';
import { LoginDto } from '@application/dto/login.dto';
import { ChangePasswordDto } from '@application/dto/change-password.dto';
import { ResetPasswordDto } from '@application/dto/reset-password.dto';
import { AuthResponseDto } from '@application/dto/auth-response.dto';
import { hashPassword, comparePassword } from '@common/utils/password.util';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  decodeTokenExpiry,
  generateSecureRandomToken,
} from '@common/utils/token.util';
import { blacklistToken, incrementLoginAttempts, clearLoginAttempts } from '@infrastructure/cache/redis.client';
import { rabbitMqPublisher } from '@infrastructure/messaging/rabbitmq.publisher';
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '@common/errors/app-error';
import { env } from '@config/env';
import { logger } from '@common/logger/logger';

const ACCOUNT_LOCK_THRESHOLD = 5;
const ACCOUNT_LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * AuthService holds every use case for authentication. Controllers are
 * thin — they only parse the request and call one of these methods.
 * Depends only on repository INTERFACES (constructor injection), so it is
 * fully unit-testable with in-memory fakes (see tests/unit/services).
 */
export class AuthService {
  constructor(
    private readonly userCredentialRepo: IUserCredentialRepository,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly passwordResetTokenRepo: IPasswordResetTokenRepository,
    private readonly auditLogRepo: IAuthAuditLogRepository,
  ) {}

  /**
   * Registers login credentials for a userId that user-service has already
   * created a profile for (auth-service does not create user profiles —
   * see docs/01-architecture.md §3 on the identity/profile split).
   */
  async register(dto: RegisterDto): Promise<{ userId: string }> {
    const existing = await this.userCredentialRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await hashPassword(dto.password);
    const credential = await this.userCredentialRepo.create({
      userId: dto.userId,
      email: dto.email.toLowerCase(),
      passwordHash,
      roles: ['USER'],
      accountStatus: AccountStatus.PENDING_VERIFICATION,
    });

    await rabbitMqPublisher.publish('auth.registered', { userId: credential.userId, email: credential.email });
    await this.auditLogRepo.record({ userId: credential.userId, eventType: AuthAuditEventType.LOGIN_SUCCESS, metadata: { action: 'register' } });

    return { userId: credential.userId };
  }

  /**
   * Authenticates an email/password pair (and MFA code if enabled),
   * applying account lockout after repeated failures, and returns a fresh
   * access/refresh token pair on success.
   */
  async login(dto: LoginDto, ctx: RequestContext): Promise<AuthResponseDto> {
    const attemptKey = dto.email.toLowerCase();
    const attempts = await incrementLoginAttempts(attemptKey, env.LOGIN_RATE_LIMIT_WINDOW_MS / 1000);
    if (attempts > env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
      throw new ForbiddenError('Too many login attempts. Please try again later.');
    }

    const credential = await this.userCredentialRepo.findByEmailWithSecret(dto.email);
    if (!credential) {
      await this.auditLogRepo.record({ eventType: AuthAuditEventType.LOGIN_FAILURE, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent, metadata: { email: dto.email, reason: 'no_such_account' } });
      throw new UnauthorizedError('Invalid email or password');
    }

    this.assertAccountIsUsable(credential.accountStatus, credential.lockedUntil);

    const passwordMatches = await comparePassword(dto.password, credential.passwordHash);
    if (!passwordMatches) {
      await this.handleFailedLogin(credential.id, ctx);
      throw new UnauthorizedError('Invalid email or password');
    }

    if (credential.mfaEnabled) {
      this.verifyMfaCodeOrThrow(credential.mfaSecret, dto.mfaCode);
    }

    await this.userCredentialRepo.resetFailedLoginAttempts(credential.id);
    await this.userCredentialRepo.update(credential.id, { lastLoginAt: new Date() });
    await clearLoginAttempts(attemptKey);

    const tokens = await this.issueTokenPair(credential.userId, credential.email, credential.roles, ctx);

    await this.auditLogRepo.record({ userId: credential.userId, eventType: AuthAuditEventType.LOGIN_SUCCESS, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent });
    await rabbitMqPublisher.publish('auth.login.succeeded', { userId: credential.userId });

    return tokens;
  }

  /**
   * Redeems a valid, unrevoked refresh token for a new access/refresh pair,
   * rotating the refresh token (old one is revoked and chained via
   * replacedByTokenId) so replay of a stolen token is detectable.
   */
  async refreshTokens(rawRefreshToken: string, ctx: RequestContext): Promise<AuthResponseDto> {
    let claims;
    try {
      claims = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const tokenHash = hashToken(rawRefreshToken);
    const stored = await this.refreshTokenRepo.findByTokenHash(tokenHash);

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      // Reuse of a revoked/rotated token is a strong signal of theft — revoke the whole family.
      if (stored?.revokedAt) {
        await this.refreshTokenRepo.revokeAllForUser(stored.userId);
        logger.warn({ userId: stored.userId }, 'Detected reuse of a revoked refresh token — family revoked');
      }
      throw new UnauthorizedError('Refresh token is invalid, expired, or already used');
    }

    const credential = await this.userCredentialRepo.findByUserId(claims.sub);
    if (!credential) throw new NotFoundError('Account no longer exists');
    this.assertAccountIsUsable(credential.accountStatus, credential.lockedUntil);

    const tokens = await this.issueTokenPair(credential.userId, credential.email, credential.roles, ctx);
    const newStored = await this.refreshTokenRepo.findByTokenHash(hashToken(tokens.refreshToken));
    await this.refreshTokenRepo.revoke(stored.id, newStored?.id);

    await this.auditLogRepo.record({ userId: credential.userId, eventType: AuthAuditEventType.TOKEN_REFRESH, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent });

    return tokens;
  }

  /** Revokes the presented access token (blacklist until natural expiry) and its refresh token. */
  async logout(accessTokenJti: string, accessTokenExpiry: Date, rawRefreshToken: string | undefined, userId: string): Promise<void> {
    const ttlSeconds = Math.max(0, Math.floor((accessTokenExpiry.getTime() - Date.now()) / 1000));
    await blacklistToken(accessTokenJti, ttlSeconds);

    if (rawRefreshToken) {
      const stored = await this.refreshTokenRepo.findByTokenHash(hashToken(rawRefreshToken));
      if (stored) await this.refreshTokenRepo.revoke(stored.id);
    }

    await this.auditLogRepo.record({ userId, eventType: AuthAuditEventType.LOGOUT });
  }

  /** Logs the user out of every device by revoking all refresh tokens for the account. */
  async logoutAllDevices(userId: string): Promise<void> {
    await this.refreshTokenRepo.revokeAllForUser(userId);
    await this.auditLogRepo.record({ userId, eventType: AuthAuditEventType.LOGOUT, metadata: { scope: 'all_devices' } });
  }

  /** Changes password for an already-authenticated user, verifying the current password first. */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const credential = await this.userCredentialRepo.findByUserId(userId);
    if (!credential) throw new NotFoundError('Account not found');

    const matches = await comparePassword(dto.currentPassword, credential.passwordHash);
    if (!matches) throw new UnauthorizedError('Current password is incorrect');

    const newHash = await hashPassword(dto.newPassword);
    await this.userCredentialRepo.update(credential.id, { passwordHash: newHash });
    await this.refreshTokenRepo.revokeAllForUser(userId); // force re-login everywhere on password change

    await this.auditLogRepo.record({ userId, eventType: AuthAuditEventType.PASSWORD_CHANGED });
    await rabbitMqPublisher.publish('auth.password.changed', { userId });
  }

  /** Issues a one-time password-reset token and (conceptually) emails it via notification-service. Always returns success, even for unknown emails, to avoid account enumeration. */
  async requestPasswordReset(email: string): Promise<void> {
    const credential = await this.userCredentialRepo.findByEmail(email);
    if (!credential) {
      logger.info({ email }, 'Password reset requested for unknown email — no-op response returned');
      return;
    }

    const rawToken = generateSecureRandomToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await this.passwordResetTokenRepo.invalidateAllForUser(credential.userId);
    await this.passwordResetTokenRepo.create({ userId: credential.userId, tokenHash, expiresAt });

    await this.auditLogRepo.record({ userId: credential.userId, eventType: AuthAuditEventType.PASSWORD_RESET_REQUESTED });

    // notification-service consumes this event and sends the actual email containing rawToken.
    await rabbitMqPublisher.publish('auth.password.reset_requested', {
      userId: credential.userId,
      email: credential.email,
      resetToken: rawToken,
      expiresAt,
    });
  }

  /** Completes a password reset using the token issued by requestPasswordReset. */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = hashToken(dto.token);
    const stored = await this.passwordResetTokenRepo.findByTokenHash(tokenHash);

    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Password reset token is invalid or has expired');
    }

    const credential = await this.userCredentialRepo.findByUserId(stored.userId);
    if (!credential) throw new NotFoundError('Account not found');

    const newHash = await hashPassword(dto.newPassword);
    await this.userCredentialRepo.update(credential.id, { passwordHash: newHash });
    await this.passwordResetTokenRepo.markUsed(stored.id);
    await this.refreshTokenRepo.revokeAllForUser(credential.userId);

    await this.auditLogRepo.record({ userId: credential.userId, eventType: AuthAuditEventType.PASSWORD_RESET_COMPLETED });
    await rabbitMqPublisher.publish('auth.password.reset_completed', { userId: credential.userId });
  }

  /** Begins MFA enrollment: generates a TOTP secret (not yet enabled until verified). */
  async initiateMfaEnrollment(userId: string): Promise<{ secret: string; otpAuthUrl: string }> {
    const credential = await this.userCredentialRepo.findByUserId(userId);
    if (!credential) throw new NotFoundError('Account not found');

    const secret = authenticator.generateSecret();
    await this.userCredentialRepo.update(credential.id, { mfaSecret: secret });
    const otpAuthUrl = authenticator.keyuri(credential.email, env.JWT_ISSUER, secret);

    return { secret, otpAuthUrl };
  }

  /** Confirms MFA enrollment by validating a TOTP code against the pending secret, then turns MFA on. */
  async confirmMfaEnrollment(userId: string, code: string): Promise<void> {
    const credential = await this.userCredentialRepo.findByUserId(userId);
    if (!credential?.mfaSecret) throw new NotFoundError('No pending MFA enrollment found');

    const isValid = authenticator.check(code, credential.mfaSecret);
    if (!isValid) throw new UnauthorizedError('Invalid MFA code');

    await this.userCredentialRepo.update(credential.id, { mfaEnabled: true });
    await this.auditLogRepo.record({ userId, eventType: AuthAuditEventType.MFA_ENABLED });
  }

  /** Disables MFA for an account (requires the caller to already be authenticated with a valid access token). */
  async disableMfa(userId: string): Promise<void> {
    const credential = await this.userCredentialRepo.findByUserId(userId);
    if (!credential) throw new NotFoundError('Account not found');

    await this.userCredentialRepo.update(credential.id, { mfaEnabled: false, mfaSecret: null });
    await this.auditLogRepo.record({ userId, eventType: AuthAuditEventType.MFA_DISABLED });
  }

  // ---- private helpers ----------------------------------------------------

  private assertAccountIsUsable(status: AccountStatus, lockedUntil: Date | null): void {
    if (status === AccountStatus.DISABLED) {
      throw new ForbiddenError('This account has been disabled');
    }
    if (status === AccountStatus.LOCKED || (lockedUntil && lockedUntil > new Date())) {
      throw new ForbiddenError('This account is temporarily locked. Try again later.');
    }
  }

  private verifyMfaCodeOrThrow(secret: string | null, code: string | undefined): void {
    if (!secret) throw new UnauthorizedError('MFA is misconfigured for this account');
    if (!code) throw new UnauthorizedError('MFA code is required');
    if (!authenticator.check(code, secret)) throw new UnauthorizedError('Invalid MFA code');
  }

  private async handleFailedLogin(credentialId: string, ctx: RequestContext): Promise<void> {
    const attempts = await this.userCredentialRepo.incrementFailedLoginAttempts(credentialId);
    await this.auditLogRepo.record({ eventType: AuthAuditEventType.LOGIN_FAILURE, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent, metadata: { credentialId, attempts } });

    if (attempts >= ACCOUNT_LOCK_THRESHOLD) {
      const until = new Date(Date.now() + ACCOUNT_LOCK_DURATION_MS);
      await this.userCredentialRepo.lockAccount(credentialId, until);
      await this.auditLogRepo.record({ eventType: AuthAuditEventType.ACCOUNT_LOCKED, metadata: { credentialId, lockedUntil: until } });
    }
  }

  private async issueTokenPair(userId: string, email: string, roles: string[], ctx: RequestContext): Promise<AuthResponseDto> {
    const access = signAccessToken({ sub: userId, email, roles });
    const refresh = signRefreshToken(userId);

    await this.refreshTokenRepo.create({
      userId,
      tokenHash: hashToken(refresh.token),
      expiresAt: decodeTokenExpiry(refresh.token),
      userAgent: ctx.userAgent ?? null,
      ipAddress: ctx.ipAddress ?? null,
    });

    return {
      accessToken: access.token,
      refreshToken: refresh.token,
      tokenType: 'Bearer',
      expiresIn: Math.floor((decodeTokenExpiry(access.token).getTime() - Date.now()) / 1000),
    };
  }
}

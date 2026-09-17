import { Router } from 'express';
import { AuthController } from '@api/controllers/auth.controller';
import { AuthService } from '@application/services/auth.service';
import { UserCredentialRepository } from '@infrastructure/repositories/user-credential.repository';
import { RefreshTokenRepository } from '@infrastructure/repositories/refresh-token.repository';
import { PasswordResetTokenRepository } from '@infrastructure/repositories/password-reset-token.repository';
import { EmailVerificationTokenRepository } from '@infrastructure/repositories/email-verification-token.repository';
import { PlatformSettingsRepository } from '@infrastructure/repositories/platform-settings.repository';
import { AuthAuditLogRepository } from '@infrastructure/repositories/auth-audit-log.repository';
import { validateDto } from '@api/middleware/validate-dto.middleware';
import { requireAuth, requireRoles } from '@api/middleware/auth.middleware';
import { loginRateLimiter } from '@api/middleware/rate-limiter.middleware';
import { RegisterDto } from '@application/dto/register.dto';
import { LoginDto } from '@application/dto/login.dto';
import { RefreshTokenDto } from '@application/dto/refresh-token.dto';
import { ChangePasswordDto } from '@application/dto/change-password.dto';
import { RequestPasswordResetDto } from '@application/dto/request-password-reset.dto';
import { ResetPasswordDto } from '@application/dto/reset-password.dto';
import { VerifyEmailDto } from '@application/dto/verify-email.dto';
import { ResendVerificationDto } from '@application/dto/resend-verification.dto';
import { VerifyMfaDto } from '@application/dto/verify-mfa.dto';
import { UpdatePlatformSettingsDto } from '@application/dto/update-platform-settings.dto';

const router = Router();

// Dependency wiring (composition root for this route module).
const authService = new AuthService(
  new UserCredentialRepository(),
  new RefreshTokenRepository(),
  new PasswordResetTokenRepository(),
  new EmailVerificationTokenRepository(),
  new PlatformSettingsRepository(),
  new AuthAuditLogRepository(),
);
const controller = new AuthController(authService);

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register login credentials for a user profile created by user-service
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RegisterDto' }
 *     responses:
 *       201: { description: Credentials created }
 *       409: { description: Email already registered }
 */
router.post('/auth/register', validateDto(RegisterDto), controller.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Authenticate with email/password (+ MFA code if enabled)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginDto' }
 *     responses:
 *       200:
 *         description: Access/refresh token pair issued
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponseDto' }
 *       401: { description: Invalid credentials }
 *       403: { description: Account locked or disabled }
 */
router.post('/auth/login', loginRateLimiter, validateDto(LoginDto), controller.login);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Exchange a valid refresh token for a new token pair (rotates the refresh token)
 *     tags: [Auth]
 *     responses:
 *       200: { description: New token pair issued }
 *       401: { description: Refresh token invalid, expired, or reused }
 */
router.post('/auth/refresh', validateDto(RefreshTokenDto), controller.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Revoke the current access token and (optionally) its refresh token
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Logged out }
 */
router.post('/auth/logout', requireAuth, controller.logout);

/**
 * @openapi
 * /auth/logout-all:
 *   post:
 *     summary: Revoke all refresh tokens for the current user (log out of every device)
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Logged out everywhere }
 */
router.post('/auth/logout-all', requireAuth, controller.logoutAll);

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     summary: Change password for the authenticated user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Password changed, all sessions revoked }
 *       401: { description: Current password incorrect }
 */
router.post('/auth/change-password', requireAuth, validateDto(ChangePasswordDto), controller.changePassword);

/**
 * @openapi
 * /auth/password-reset/request:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 *     responses:
 *       202: { description: Request accepted (response is identical whether or not the email exists) }
 */
router.post('/auth/password-reset/request', validateDto(RequestPasswordResetDto), controller.requestPasswordReset);

/**
 * @openapi
 * /auth/password-reset/confirm:
 *   post:
 *     summary: Complete a password reset using the emailed token
 *     tags: [Auth]
 *     responses:
 *       204: { description: Password reset }
 *       401: { description: Token invalid or expired }
 */
router.post('/auth/password-reset/confirm', validateDto(ResetPasswordDto), controller.resetPassword);

/**
 * @openapi
 * /auth/verify-email:
 *   post:
 *     summary: Completes email verification with the token from the verification email — the only way PENDING_VERIFICATION becomes ACTIVE
 *     tags: [Auth]
 *     responses:
 *       200: { description: Email verified }
 *       401: { description: Token invalid or expired }
 */
router.post('/auth/verify-email', validateDto(VerifyEmailDto), controller.verifyEmail);

/**
 * @openapi
 * /auth/verify-email/resend:
 *   post:
 *     summary: Resends the verification email for a still-unverified account
 *     tags: [Auth]
 *     responses:
 *       202: { description: Accepted (always, regardless of whether the email exists) }
 */
router.post('/auth/verify-email/resend', validateDto(ResendVerificationDto), controller.resendVerification);

/**
 * @openapi
 * /auth/mfa/enroll:
 *   post:
 *     summary: Begin MFA enrollment (returns a TOTP secret + otpauth URL for a QR code)
 *     tags: [Auth, MFA]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: TOTP secret issued, pending confirmation }
 */
router.post('/auth/mfa/enroll', requireAuth, controller.initiateMfaEnrollment);

/**
 * @openapi
 * /auth/mfa/confirm:
 *   post:
 *     summary: Confirm MFA enrollment with a TOTP code, turning MFA on
 *     tags: [Auth, MFA]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: MFA enabled }
 *       401: { description: Invalid code }
 */
router.post('/auth/mfa/confirm', requireAuth, validateDto(VerifyMfaDto), controller.confirmMfaEnrollment);

/**
 * @openapi
 * /auth/mfa/disable:
 *   post:
 *     summary: Disable MFA for the authenticated user
 *     tags: [Auth, MFA]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: MFA disabled }
 */
router.post('/auth/mfa/disable', requireAuth, controller.disableMfa);

/**
 * @openapi
 * /auth/settings:
 *   get:
 *     summary: Platform-wide runtime settings (currently just requireEmailVerification) — ADMIN only
 *     tags: [Auth, Settings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current settings
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PlatformSettingsResponseDto' }
 *       403: { description: Caller is not platform ADMIN }
 */
router.get('/auth/settings', requireAuth, requireRoles('ADMIN'), controller.getPlatformSettings);

/**
 * @openapi
 * /auth/settings:
 *   patch:
 *     summary: Updates platform-wide runtime settings for every current and future user — ADMIN only, no restart required
 *     tags: [Auth, Settings]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdatePlatformSettingsDto' }
 *     responses:
 *       200: { description: Settings updated }
 *       403: { description: Caller is not platform ADMIN }
 */
router.patch('/auth/settings', requireAuth, requireRoles('ADMIN'), validateDto(UpdatePlatformSettingsDto), controller.updatePlatformSettings);

export { router as authRouter };

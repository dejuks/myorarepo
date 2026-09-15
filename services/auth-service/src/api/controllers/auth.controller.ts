import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@application/services/auth.service';
import { RegisterDto } from '@application/dto/register.dto';
import { LoginDto } from '@application/dto/login.dto';
import { RefreshTokenDto } from '@application/dto/refresh-token.dto';
import { ChangePasswordDto } from '@application/dto/change-password.dto';
import { RequestPasswordResetDto } from '@application/dto/request-password-reset.dto';
import { ResetPasswordDto } from '@application/dto/reset-password.dto';
import { VerifyMfaDto } from '@application/dto/verify-mfa.dto';
import { AuthenticatedRequest } from '@api/middleware/auth.middleware';
import { decodeTokenExpiry } from '@common/utils/token.util';

/**
 * Controllers only: parse HTTP request -> call the service -> shape the
 * HTTP response. No business logic lives here (Service Layer Pattern).
 */
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request<unknown, unknown, RegisterDto>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.register(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request<unknown, unknown, LoginDto>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokens = await this.authService.login(req.body, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
      });
      res.status(200).json({ success: true, data: tokens });
    } catch (err) {
      next(err);
    }
  };

  refresh = async (req: Request<unknown, unknown, RefreshTokenDto>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokens = await this.authService.refreshTokens(req.body.refreshToken, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
      });
      res.status(200).json({ success: true, data: tokens });
    } catch (err) {
      next(err);
    }
  };

  logout = async (req: AuthenticatedRequest & Request<unknown, unknown, RefreshTokenDto>, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new Error('Unauthenticated request reached logout handler');
      const header = req.headers.authorization as string;
      const accessToken = header.substring('Bearer '.length);
      await this.authService.logout(req.user.jti, decodeTokenExpiry(accessToken), req.body?.refreshToken, req.user.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  logoutAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new Error('Unauthenticated request reached logoutAll handler');
      await this.authService.logoutAllDevices(req.user.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  changePassword = async (req: AuthenticatedRequest & Request<unknown, unknown, ChangePasswordDto>, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new Error('Unauthenticated request reached changePassword handler');
      await this.authService.changePassword(req.user.userId, req.body);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  requestPasswordReset = async (req: Request<unknown, unknown, RequestPasswordResetDto>, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.authService.requestPasswordReset(req.body.email);
      res.status(202).json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    } catch (err) {
      next(err);
    }
  };

  resetPassword = async (req: Request<unknown, unknown, ResetPasswordDto>, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.authService.resetPassword(req.body);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  initiateMfaEnrollment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new Error('Unauthenticated request reached MFA handler');
      const result = await this.authService.initiateMfaEnrollment(req.user.userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  confirmMfaEnrollment = async (req: AuthenticatedRequest & Request<unknown, unknown, VerifyMfaDto>, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new Error('Unauthenticated request reached MFA handler');
      await this.authService.confirmMfaEnrollment(req.user.userId, req.body.code);
      res.status(200).json({ success: true, message: 'MFA enabled successfully' });
    } catch (err) {
      next(err);
    }
  };

  disableMfa = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new Error('Unauthenticated request reached MFA handler');
      await this.authService.disableMfa(req.user.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}

import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '@common/utils/token.util';
import { isTokenBlacklisted } from '@infrastructure/cache/redis.client';
import { UnauthorizedError, ForbiddenError } from '@common/errors/app-error';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    roles: string[];
    jti: string;
  };
}

/**
 * Verifies the Bearer access token on protected routes. This is the same
 * verification logic every other ORA service performs via the shared
 * @ora/auth-client package (see docs/01-architecture.md §3) — auth-service
 * itself uses it locally for its own protected endpoints (e.g. logout).
 */
export async function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }

    const token = header.substring('Bearer '.length);
    const claims = verifyAccessToken(token);

    if (await isTokenBlacklisted(claims.jti)) {
      throw new UnauthorizedError('Token has been revoked');
    }

    req.user = { userId: claims.sub, email: claims.email, roles: claims.roles, jti: claims.jti };
    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) return next(err);
    next(new UnauthorizedError('Invalid or expired access token'));
  }
}

/** Role-based access guard, used e.g. on admin-only endpoints. */
export function requireRoles(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new UnauthorizedError());
    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) return next(new ForbiddenError('Insufficient permissions'));
    next();
  };
}

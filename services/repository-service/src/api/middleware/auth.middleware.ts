import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '@common/utils/token.util';
import { UnauthorizedError, ForbiddenError } from '@common/errors/app-error';

export interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string; roles: string[]; jti: string };
}

/** Verifies the Bearer access token issued by auth-service — same contract as every other service. No RabbitMQ/Redis dependency in this module: authorization is 100% local to this service's own database. */
export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedError('Missing or malformed Authorization header');

    const token = header.substring('Bearer '.length);
    const claims = verifyAccessToken(token);
    req.user = { userId: claims.sub, email: claims.email, roles: claims.roles, jti: claims.jti };
    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) return next(err);
    next(new UnauthorizedError('Invalid or expired access token'));
  }
}

export function requireRoles(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new UnauthorizedError());
    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) return next(new ForbiddenError('Insufficient permissions'));
    next();
  };
}

/** Allows the resource owner OR someone holding one of the allowed roles — the common pattern for "view my own membership" endpoints. */
export function requireSelfOrRoles(paramName: string, ...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new UnauthorizedError());
    const targetId = req.params[paramName];
    const isSelf = req.user.userId === targetId;
    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));
    if (!isSelf && !hasRole) return next(new ForbiddenError('Insufficient permissions'));
    next();
  };
}

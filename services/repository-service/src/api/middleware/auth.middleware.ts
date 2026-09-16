import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '@common/utils/token.util';
import { UnauthorizedError, ForbiddenError } from '@common/errors/app-error';

export interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string; roles: string[]; jti: string };
}

/**
 * The platform-wide role (owned and issued by user-service/auth-service, carried in the JWT `roles` claim)
 * that automatically overrides every module's own local authorization. A caller holding this role does not
 * need a module-local role assignment to pass `requireRoles`/`requireSelfOrRoles` in this service — the
 * global super-admin can manage every module without being separately provisioned in each one.
 */
export const PLATFORM_ADMIN_ROLE = 'ADMIN';

/** Verifies the Bearer access token issued by auth-service — same contract as every other service. */
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
    const hasRole = req.user.roles.includes(PLATFORM_ADMIN_ROLE) || req.user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) return next(new ForbiddenError('Insufficient permissions'));
    next();
  };
}

/** Allows the resource owner OR a member with one of the allowed roles (or the platform ADMIN override) — the common pattern for "view/edit my own membership" endpoints. */
export function requireSelfOrRoles(paramName: string, ...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new UnauthorizedError());
    const targetId = req.params[paramName];
    const isSelf = req.user.userId === targetId;
    const hasRole = req.user.roles.includes(PLATFORM_ADMIN_ROLE) || req.user.roles.some((role) => allowedRoles.includes(role));
    if (!isSelf && !hasRole) return next(new ForbiddenError('Insufficient permissions'));
    next();
  };
}

/**
 * Restricts an endpoint to the platform-wide ADMIN only — no module-local role, including this module's own
 * top role, satisfies this check. Used for role/permission CATALOG management (creating or deleting roles
 * themselves), which is a platform-level decision per the platform's RBAC model; assigning an EXISTING role to
 * a member stays with the module's own top role via `requireRoles`, which also accepts ADMIN automatically.
 */
export function requireAdmin(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  if (!req.user) return next(new UnauthorizedError());
  if (!req.user.roles.includes(PLATFORM_ADMIN_ROLE)) return next(new ForbiddenError('Insufficient permissions'));
  next();
}

import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '@common/utils/token.util';
import { UnauthorizedError, ForbiddenError } from '@common/errors/app-error';
import { IUserRoleAssignmentRepository } from '@domain/repositories/user-role-assignment.repository.interface';

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

/**
 * Like `requireAuth`, but a missing/invalid token is not an error — it just leaves `req.user` unset. Used on
 * public read endpoints (article list/detail) that still want to know WHO is asking, so an author can see
 * their own unpublished drafts without every anonymous visitor being rejected. Never use this to gate a
 * write or a moderation action — only `requireAuth`/`requireRoles`/`requireModuleRole` do that.
 */
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  try {
    const claims = verifyAccessToken(header.substring('Bearer '.length));
    req.user = { userId: claims.sub, email: claims.email, roles: claims.roles, jti: claims.jti };
  } catch {
    // Invalid/expired token on a public endpoint: treat the same as no token, not an error.
  }
  next();
}

/**
 * Like `requireRoles`, but checks the caller's ACTUAL role assignment in this service's own `wiki_db` via a
 * live query, not the JWT `roles` claim — the platform-wide ADMIN override still short-circuits via the JWT,
 * since that role genuinely does live there. This exists because module-local roles (e.g. BUREAUCRAT) are
 * never synced into the JWT (see wiki-service's README and MemberRoleService's doc comment for the full
 * writeup), which made `requireRoles` unusable for real moderation endpoints — a non-ADMIN Administrator or
 * Bureaucrat could never actually pass it. Phase 2's review/publish/archive actions are the first endpoints
 * that need a real (non-ADMIN) module role to work, so this is where that gap finally gets closed. Reads
 * live from `wiki_db` only — no call to any other service — keeping the module fully standalone.
 */
export function requireModuleRole(userRoleRepo: IUserRoleAssignmentRepository, ...allowedRoles: string[]) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) return next(new UnauthorizedError());
    if (req.user.roles.includes(PLATFORM_ADMIN_ROLE)) return next();
    try {
      const myRoles = await userRoleRepo.listRoleNamesForUser(req.user.userId);
      if (myRoles.some((role) => allowedRoles.includes(role))) return next();
      next(new ForbiddenError('Insufficient permissions'));
    } catch (err) {
      next(err);
    }
  };
}

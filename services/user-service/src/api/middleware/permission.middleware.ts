import { NextFunction, Response } from 'express';
import { PermissionService } from '@application/services/permission.service';
import { ForbiddenError, UnauthorizedError } from '@common/errors/app-error';
import { AuthenticatedRequest } from '@api/middleware/auth.middleware';

/**
 * Real, per-request permission enforcement. Deliberately NOT based on the
 * JWT's `roles` claim (a login-time snapshot that goes stale the moment a
 * role's permissions, or the caller's own role assignment, change) —
 * instead does a live database lookup through PermissionService on every
 * request. See PermissionService.userHasPermission's doc comment for why.
 */
export function requirePermission(permissionService: PermissionService, permissionKey: string) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    try {
      const allowed = await permissionService.userHasPermission(req.user.userId, permissionKey);
      if (!allowed) {
        next(new ForbiddenError('Insufficient permissions'));
        return;
      }
      next();
    } catch (err) {
      next(err as Error);
    }
  };
}

/** Like requirePermission, but also allows the request through when the caller is acting on their own record. */
export function requireSelfOrPermission(permissionService: PermissionService, paramName: string, permissionKey: string) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (req.user.userId === req.params[paramName]) {
      next();
      return;
    }
    try {
      const allowed = await permissionService.userHasPermission(req.user.userId, permissionKey);
      if (!allowed) {
        next(new ForbiddenError('Insufficient permissions'));
        return;
      }
      next();
    } catch (err) {
      next(err as Error);
    }
  };
}

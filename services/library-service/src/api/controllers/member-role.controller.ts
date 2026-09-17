import { Response, NextFunction } from 'express';
import { MemberRoleService } from '@application/services/member-role.service';
import { AssignRoleDto } from '@application/dto/assign-role.dto';
import { AuthenticatedRequest } from '@api/middleware/auth.middleware';
import { UnauthorizedError } from '@common/errors/app-error';

export class MemberRoleController {
  constructor(private readonly memberRoleService: MemberRoleService) {}

  // `data` here is a bare string[] of role names — not { userId, roles } — to match every
  // other module service and the frontend's single shared moduleApi.ts client (see
  // wiki-service's member-role.service.ts for the fuller writeup of this exact bug: the
  // wrapped shape silently broke useMyManagedModules()'s self-check, which decides whether
  // a non-platform-ADMIN module manager sees their module's "— Roles" sidebar link at all).
  list = async (req: AuthenticatedRequest & { params: { userId: string } }, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roles = await this.memberRoleService.listRolesForUser(req.params.userId);
      res.status(200).json({ success: true, data: roles });
    } catch (err) {
      next(err);
    }
  };

  assign = async (
    req: AuthenticatedRequest & { params: { userId: string }; body: AssignRoleDto },
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const roles = await this.memberRoleService.assignRole(req.params.userId, req.body.roleName, req.user.userId);
      res.status(201).json({ success: true, data: roles });
    } catch (err) {
      next(err);
    }
  };

  revoke = async (req: AuthenticatedRequest & { params: { userId: string; roleName: string } }, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.memberRoleService.revokeRole(req.params.userId, req.params.roleName);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}

import { Response, NextFunction } from 'express';
import { MemberRoleService } from '@application/services/member-role.service';
import { AssignRoleDto } from '@application/dto/assign-role.dto';
import { AuthenticatedRequest } from '@api/middleware/auth.middleware';
import { UnauthorizedError } from '@common/errors/app-error';

export class MemberRoleController {
  constructor(private readonly memberRoleService: MemberRoleService) {}

  list = async (req: AuthenticatedRequest & { params: { userId: string } }, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roles = await this.memberRoleService.listRolesForUser(req.params.userId);
      res.status(200).json({ success: true, data: { userId: req.params.userId, roles } });
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
      res.status(201).json({ success: true, data: { userId: req.params.userId, roles } });
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

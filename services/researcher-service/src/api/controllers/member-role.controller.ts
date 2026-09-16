import { Request, Response, NextFunction } from 'express';
import { MemberRoleService } from '@application/services/member-role.service';
import { AssignRoleDto } from '@application/dto/assign-role.dto';
import { AuthenticatedRequest } from '@api/middleware/auth.middleware';

export class MemberRoleController {
  constructor(private readonly memberRoleService: MemberRoleService) {}

  list = async (req: Request<{ userId: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roles = await this.memberRoleService.listRolesForUser(req.params.userId);
      res.status(200).json({ success: true, data: roles });
    } catch (err) {
      next(err);
    }
  };

  assign = async (req: AuthenticatedRequest & Request<{ userId: string }, unknown, AssignRoleDto>, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new Error('Unauthenticated request reached assign handler');
      const roles = await this.memberRoleService.assignRole(req.params.userId, req.body.roleName, req.user.userId);
      res.status(200).json({ success: true, data: roles });
    } catch (err) {
      next(err);
    }
  };

  revoke = async (req: AuthenticatedRequest & Request<{ userId: string; roleName: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roles = await this.memberRoleService.revokeRole(req.params.userId, req.params.roleName);
      res.status(200).json({ success: true, data: roles });
    } catch (err) {
      next(err);
    }
  };
}

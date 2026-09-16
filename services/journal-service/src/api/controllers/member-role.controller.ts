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

  assign = async (req: Request<{ userId: string }, unknown, AssignRoleDto> & AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const actorUserId = req.user!.userId;
      const roles = await this.memberRoleService.assignRole(req.params.userId, req.body.roleName, actorUserId);
      res.status(201).json({ success: true, data: roles });
    } catch (err) {
      next(err);
    }
  };

  revoke = async (req: Request<{ userId: string; roleName: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roles = await this.memberRoleService.revokeRole(req.params.userId, req.params.roleName);
      res.status(200).json({ success: true, data: roles });
    } catch (err) {
      next(err);
    }
  };
}

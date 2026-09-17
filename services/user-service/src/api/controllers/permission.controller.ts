import { Request, Response, NextFunction } from 'express';
import { PermissionService } from '@application/services/permission.service';
import { SetRolePermissionsDto } from '@application/dto/set-role-permissions.dto';

export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const permissions = await this.permissionService.listPermissions();
      res.status(200).json({ success: true, data: permissions });
    } catch (err) {
      next(err);
    }
  };

  getForRole = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.permissionService.getRolePermissions(req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  setForRole = async (
    req: Request<{ id: string }, unknown, SetRolePermissionsDto>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.permissionService.setRolePermissions(req.params.id, req.body.permissionKeys);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };
}

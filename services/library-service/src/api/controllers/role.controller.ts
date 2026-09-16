import { Request, Response, NextFunction } from 'express';
import { RoleService } from '@application/services/role.service';
import { CreateRoleDto } from '@application/dto/create-role.dto';

export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roles = await this.roleService.listRoles();
      res.status(200).json({ success: true, data: roles });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request<unknown, unknown, CreateRoleDto>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const role = await this.roleService.createRole(req.body);
      res.status(201).json({ success: true, data: role });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.roleService.deleteRole(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}

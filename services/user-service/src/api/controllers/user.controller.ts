import { Request, Response, NextFunction } from 'express';
import { UserService } from '@application/services/user.service';
import { CreateUserDto } from '@application/dto/create-user.dto';
import { UpdateProfileDto } from '@application/dto/update-profile.dto';
import { ChangeStatusDto } from '@application/dto/change-status.dto';
import { AssignRoleDto } from '@application/dto/assign-role.dto';
import { ListUsersQueryDto } from '@application/dto/list-users-query.dto';
import { AuthenticatedRequest } from '@api/middleware/auth.middleware';

export class UserController {
  constructor(private readonly userService: UserService) {}

  create = async (req: Request<unknown, unknown, CreateUserDto>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userService.createUser(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userService.getById(req.params.id);
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  };

  getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new Error('Unauthenticated request reached getMe handler');
      const user = await this.userService.getById(req.user.userId);
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  };

  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = res.locals.query as ListUsersQueryDto;
      const result = await this.userService.listUsers({
        status: query.status,
        search: query.search,
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
      });
      res.status(200).json({ success: true, data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize } });
    } catch (err) {
      next(err);
    }
  };

  updateProfile = async (req: Request<{ id: string }, unknown, UpdateProfileDto>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userService.updateProfile(req.params.id, req.body);
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  };

  changeStatus = async (req: AuthenticatedRequest & Request<{ id: string }, unknown, ChangeStatusDto>, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new Error('Unauthenticated request reached changeStatus handler');
      const user = await this.userService.changeStatus(req.params.id, req.body, req.user.userId);
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  };

  assignRole = async (req: AuthenticatedRequest & Request<{ id: string }, unknown, AssignRoleDto>, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new Error('Unauthenticated request reached assignRole handler');
      const user = await this.userService.assignRole(req.params.id, req.body.roleName, req.user.userId);
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  };

  revokeRole = async (req: AuthenticatedRequest & Request<{ id: string; roleName: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new Error('Unauthenticated request reached revokeRole handler');
      const user = await this.userService.revokeRole(req.params.id, req.params.roleName, req.user.userId);
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  };
}

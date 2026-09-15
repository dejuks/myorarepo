import { Response, NextFunction } from 'express';
import { NotificationQueryService } from '@application/services/notification-query.service';
import { AuthenticatedRequest } from '@api/middleware/auth.middleware';
import { ListNotificationsQueryDto } from '@application/dto/list-notifications-query.dto';

export class NotificationController {
  constructor(private readonly queryService: NotificationQueryService) {}

  list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new Error('Unauthenticated request reached list handler');
      const query = res.locals.query as ListNotificationsQueryDto;
      const result = await this.queryService.listForUser({
        userId: req.user.userId,
        unreadOnly: query.unreadOnly,
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20,
      });
      res.status(200).json({ success: true, data: result.items, meta: { total: result.total, page: result.page, pageSize: result.pageSize } });
    } catch (err) {
      next(err);
    }
  };

  unreadCount = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new Error('Unauthenticated request reached unreadCount handler');
      const count = await this.queryService.countUnread(req.user.userId);
      res.status(200).json({ success: true, data: { count } });
    } catch (err) {
      next(err);
    }
  };

  markRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new Error('Unauthenticated request reached markRead handler');
      await this.queryService.markAsRead(req.params.id, req.user.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  markAllRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new Error('Unauthenticated request reached markAllRead handler');
      const count = await this.queryService.markAllAsRead(req.user.userId);
      res.status(200).json({ success: true, data: { markedCount: count } });
    } catch (err) {
      next(err);
    }
  };
}

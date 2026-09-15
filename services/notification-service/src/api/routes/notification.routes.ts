import { Router } from 'express';
import { NotificationController } from '@api/controllers/notification.controller';
import { NotificationQueryService } from '@application/services/notification-query.service';
import { NotificationRepository } from '@infrastructure/repositories/notification.repository';
import { requireAuth } from '@api/middleware/auth.middleware';
import { validateQueryDto } from '@api/middleware/validate-dto.middleware';
import { ListNotificationsQueryDto } from '@application/dto/list-notifications-query.dto';

const router = Router();
const queryService = new NotificationQueryService(new NotificationRepository());
const controller = new NotificationController(queryService);

/**
 * @openapi
 * /notifications:
 *   get:
 *     summary: List the authenticated user's own notifications (paginated, optional unread filter)
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated notifications }
 */
router.get('/notifications', requireAuth, validateQueryDto(ListNotificationsQueryDto), controller.list);

/**
 * @openapi
 * /notifications/unread-count:
 *   get:
 *     summary: Count the authenticated user's unread notifications
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Unread count }
 */
router.get('/notifications/unread-count', requireAuth, controller.unreadCount);

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark a single notification as read
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Marked read }
 *       403: { description: Notification belongs to a different user }
 *       404: { description: Not found }
 */
router.patch('/notifications/:id/read', requireAuth, controller.markRead);

/**
 * @openapi
 * /notifications/read-all:
 *   post:
 *     summary: Mark all of the authenticated user's notifications as read
 *     tags: [Notifications]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Count of notifications marked read }
 */
router.post('/notifications/read-all', requireAuth, controller.markAllRead);

export { router as notificationRouter };

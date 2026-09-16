import { NotificationChannel } from '@domain/entities/notification.entity';

/**
 * Maps an inbound domain event's routing key to the notification
 * template(s) it should trigger. This is the one place that knows "when X
 * happens, notify the user via Y channels" — adding a new event just adds
 * a line here plus the matching template rows (see the migration seed).
 */
export const EVENT_TEMPLATE_MAP: Record<string, { templateCode: string; channels: NotificationChannel[] }> = {
  'auth.registered': { templateCode: 'WELCOME', channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP] },
  'auth.password.reset_requested': { templateCode: 'PASSWORD_RESET_REQUESTED', channels: [NotificationChannel.EMAIL] },
  'auth.password.reset_completed': { templateCode: 'PASSWORD_RESET_COMPLETED', channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP] },
  'auth.password.changed': { templateCode: 'PASSWORD_CHANGED', channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP] },
  'auth.email_verification.requested': { templateCode: 'EMAIL_VERIFICATION_REQUESTED', channels: [NotificationChannel.EMAIL] },
  'auth.email_verification.completed': { templateCode: 'EMAIL_VERIFICATION_COMPLETED', channels: [NotificationChannel.IN_APP] },
  'user.registered': { templateCode: 'PROFILE_CREATED', channels: [NotificationChannel.IN_APP] },
  'user.role_assigned': { templateCode: 'ROLE_ASSIGNED', channels: [NotificationChannel.IN_APP] },
  'user.status_changed': { templateCode: 'ACCOUNT_STATUS_CHANGED', channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP] },
};

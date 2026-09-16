/** Mirrors services/user-service/src/domain/entities/user.entity.ts */
export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  locale: string;
  status: UserStatus;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Live join from user-service (not a JWT claim) — always current, see UserWithRoles on the backend. */
  roles: string[];
}

/** Mirrors services/user-service/src/domain/entities/role.entity.ts */
export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
}

/** Mirrors services/auth-service/src/application/dto/auth-response.dto.ts */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

/** Mirrors services/notification-service/src/domain/entities/notification.entity.ts */
export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export interface Notification {
  id: string;
  userId: string;
  channel: NotificationChannel;
  templateCode: string;
  subject: string | null;
  body: string;
  status: NotificationStatus;
  metadata: Record<string, unknown> | null;
  errorMessage: string | null;
  readAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Mirrors services/user-service/src/domain/entities/user.entity.ts */
export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

/** Mirrors services/user-service/src/domain/entities/user.entity.ts */
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
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
  gender: Gender | null;
  /** ISO date string, e.g. "1990-05-17" (no time component). */
  dateOfBirth: string | null;
  address: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  /** IANA timezone name, e.g. "Africa/Addis_Ababa". */
  timezone: string | null;
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

/** Mirrors services/user-service/src/domain/entities/permission.entity.ts — a fixed, code-defined catalog entry. */
export interface Permission {
  id: string;
  key: string;
  /** Checkbox group heading, e.g. "User Management" — mirrors the GitHub OAuth "Select scopes" UI. */
  category: string;
  label: string;
  description: string | null;
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

/** Mirrors services/wiki-service/src/domain/entities/article.entity.ts's ArticleStatus. */
export type ArticleStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED' | 'REJECTED';

/** Mirrors services/wiki-service/src/domain/entities/article.entity.ts */
export interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  language: string;
  categoryId: string | null;
  featuredImageUrl: string | null;
  status: ArticleStatus;
  publishedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** GET/POST/PUT article responses combine the Article row with its current (latest) revision's content and tags. */
export interface ArticleWithContent extends Article {
  content: string;
  editSummary: string | null;
  revisionId: string;
  editorUserId: string;
  revisionCreatedAt: string;
  tags: Tag[];
}

/** Mirrors services/wiki-service/src/domain/entities/revision.entity.ts */
export interface Revision {
  id: string;
  articleId: string;
  content: string;
  editSummary: string | null;
  editorUserId: string;
  createdAt: string;
}

/** Mirrors services/wiki-service/src/domain/entities/category.entity.ts */
export interface Category {
  id: string;
  name: string;
  description: string | null;
  parentCategoryId: string | null;
  language: string;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

/** Mirrors services/wiki-service/src/domain/entities/tag.entity.ts */
export interface Tag {
  id: string;
  name: string;
  description: string | null;
  language: string;
  createdAt: string;
}

/** Mirrors services/wiki-service/src/domain/entities/article-review.entity.ts's ReviewDecision. */
export type ReviewDecision = 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';

/** Mirrors services/wiki-service/src/domain/entities/article-review.entity.ts */
export interface ArticleReview {
  id: string;
  articleId: string;
  reviewerUserId: string;
  comment: string | null;
  decision: ReviewDecision;
  createdAt: string;
}

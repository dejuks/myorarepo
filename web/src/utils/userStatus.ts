import { UserStatus } from '@/types/domain';

/**
 * Mirrors UserService#assertValidTransition (services/user-service/src/application/services/user.service.ts):
 * PENDING -> ACTIVE | DEACTIVATED
 * ACTIVE -> SUSPENDED | DEACTIVATED
 * SUSPENDED -> ACTIVE | DEACTIVATED
 * DEACTIVATED -> (terminal, no transitions out)
 */
export const USER_STATUS_TRANSITIONS: Record<UserStatus, UserStatus[]> = {
  [UserStatus.PENDING]: [UserStatus.ACTIVE, UserStatus.DEACTIVATED],
  [UserStatus.ACTIVE]: [UserStatus.SUSPENDED, UserStatus.DEACTIVATED],
  [UserStatus.SUSPENDED]: [UserStatus.ACTIVE, UserStatus.DEACTIVATED],
  [UserStatus.DEACTIVATED]: [],
};

/** The set of statuses it's valid to transition *to* from `current` (excludes `current` itself). */
export function getValidNextStatuses(current: UserStatus): UserStatus[] {
  return USER_STATUS_TRANSITIONS[current] ?? [];
}

export type StatusChipColor = 'success' | 'warning' | 'error' | 'default';

export function userStatusChipColor(status: UserStatus): StatusChipColor {
  switch (status) {
    case UserStatus.ACTIVE:
      return 'success';
    case UserStatus.PENDING:
      return 'warning';
    case UserStatus.SUSPENDED:
      return 'error';
    case UserStatus.DEACTIVATED:
    default:
      return 'default';
  }
}

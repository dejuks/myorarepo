import { describe, expect, it } from 'vitest';
import { getValidNextStatuses, userStatusChipColor } from '@/utils/userStatus';
import { UserStatus } from '@/types/domain';

describe('getValidNextStatuses', () => {
  it('allows PENDING to move to ACTIVE or DEACTIVATED', () => {
    expect(getValidNextStatuses(UserStatus.PENDING)).toEqual([UserStatus.ACTIVE, UserStatus.DEACTIVATED]);
  });

  it('allows ACTIVE to move to SUSPENDED or DEACTIVATED', () => {
    expect(getValidNextStatuses(UserStatus.ACTIVE)).toEqual([UserStatus.SUSPENDED, UserStatus.DEACTIVATED]);
  });

  it('allows SUSPENDED to move to ACTIVE or DEACTIVATED', () => {
    expect(getValidNextStatuses(UserStatus.SUSPENDED)).toEqual([UserStatus.ACTIVE, UserStatus.DEACTIVATED]);
  });

  it('treats DEACTIVATED as terminal — no valid next statuses', () => {
    expect(getValidNextStatuses(UserStatus.DEACTIVATED)).toEqual([]);
  });

  it('never includes the current status itself among the options', () => {
    for (const status of Object.values(UserStatus)) {
      expect(getValidNextStatuses(status)).not.toContain(status);
    }
  });
});

describe('userStatusChipColor', () => {
  it('maps each status to a distinct MUI chip color', () => {
    expect(userStatusChipColor(UserStatus.ACTIVE)).toBe('success');
    expect(userStatusChipColor(UserStatus.PENDING)).toBe('warning');
    expect(userStatusChipColor(UserStatus.SUSPENDED)).toBe('error');
    expect(userStatusChipColor(UserStatus.DEACTIVATED)).toBe('default');
  });
});

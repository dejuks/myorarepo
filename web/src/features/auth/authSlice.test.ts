import { describe, expect, it, beforeEach } from 'vitest';
import reducer, {
  credentialsReceived,
  tokensRotated,
  currentUserLoaded,
  bootstrapFinished,
  loggedOut,
  type AuthState,
} from '@/features/auth/authSlice';
import type { AuthResponse, User, UserStatus } from '@/types/domain';

const baseState: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isBootstrapping: false,
};

const tokens: AuthResponse = {
  accessToken: 'access-123',
  refreshToken: 'refresh-456',
  tokenType: 'Bearer',
  expiresIn: 900,
};

const user: User = {
  id: 'u1',
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  displayName: null,
  avatarUrl: null,
  bio: null,
  phone: null,
  locale: 'en',
  status: 'ACTIVE' as UserStatus,
  deactivatedAt: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  roles: ['USER'],
};

describe('authSlice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns the initial state for an unknown action', () => {
    const state = reducer(undefined, { type: 'unknown' });
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
  });

  it('credentialsReceived sets tokens, marks authenticated, and persists the refresh token', () => {
    const state = reducer(baseState, credentialsReceived(tokens));
    expect(state.accessToken).toBe('access-123');
    expect(state.refreshToken).toBe('refresh-456');
    expect(state.isAuthenticated).toBe(true);
    expect(state.isBootstrapping).toBe(false);
    expect(localStorage.getItem('ora.refreshToken')).toBe('refresh-456');
  });

  it('does not persist the access token to localStorage', () => {
    reducer(baseState, credentialsReceived(tokens));
    const storedKeys = Object.keys(localStorage);
    for (const key of storedKeys) {
      expect(localStorage.getItem(key)).not.toBe('access-123');
    }
  });

  it('tokensRotated updates both tokens without touching user/isAuthenticated', () => {
    const authenticated = { ...baseState, isAuthenticated: true, user, accessToken: 'old', refreshToken: 'old-r' };
    const rotated: AuthResponse = { ...tokens, accessToken: 'new-access', refreshToken: 'new-refresh' };
    const state = reducer(authenticated, tokensRotated(rotated));
    expect(state.accessToken).toBe('new-access');
    expect(state.refreshToken).toBe('new-refresh');
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(user);
    expect(localStorage.getItem('ora.refreshToken')).toBe('new-refresh');
  });

  it('currentUserLoaded sets the user without altering auth flags', () => {
    const state = reducer(baseState, currentUserLoaded(user));
    expect(state.user).toEqual(user);
    expect(state.isAuthenticated).toBe(false);
  });

  it('bootstrapFinished clears the bootstrapping flag only', () => {
    const state = reducer({ ...baseState, isBootstrapping: true }, bootstrapFinished());
    expect(state.isBootstrapping).toBe(false);
    expect(state.isAuthenticated).toBe(false);
  });

  it('loggedOut clears all auth state and removes the persisted refresh token', () => {
    localStorage.setItem('ora.refreshToken', 'refresh-456');
    const authenticated: AuthState = {
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
      user,
      isAuthenticated: true,
      isBootstrapping: false,
    };
    const state = reducer(authenticated, loggedOut());
    expect(state).toEqual(baseState);
    expect(localStorage.getItem('ora.refreshToken')).toBeNull();
  });
});

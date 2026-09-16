import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthResponse, User } from '@/types/domain';

const REFRESH_TOKEN_STORAGE_KEY = 'ora.refreshToken';

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  /** True while the app is attempting a silent refresh on boot; gates protected-route rendering. */
  isBootstrapping: boolean;
}

function readStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function persistRefreshToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable (private browsing, blocked storage, etc.) — in-memory state still works
    // for the current tab, it just won't survive a refresh.
  }
}

const initialState: AuthState = {
  accessToken: null,
  refreshToken: readStoredRefreshToken(),
  user: null,
  isAuthenticated: false,
  isBootstrapping: readStoredRefreshToken() !== null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Login or a completed silent refresh: we now have a fresh token pair. */
    credentialsReceived(state, action: PayloadAction<AuthResponse>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      state.isBootstrapping = false;
      persistRefreshToken(action.payload.refreshToken);
    },
    /** Set by the axios interceptor after a silent mid-session refresh (keeps `user` intact). */
    tokensRotated(state, action: PayloadAction<AuthResponse>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      persistRefreshToken(action.payload.refreshToken);
    },
    currentUserLoaded(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    bootstrapFinished(state) {
      state.isBootstrapping = false;
    },
    loggedOut(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.isAuthenticated = false;
      state.isBootstrapping = false;
      persistRefreshToken(null);
    },
  },
});

export const { credentialsReceived, tokensRotated, currentUserLoaded, bootstrapFinished, loggedOut } =
  authSlice.actions;

export default authSlice.reducer;

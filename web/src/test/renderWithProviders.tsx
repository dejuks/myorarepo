import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import authReducer, { type AuthState } from '@/features/auth/authSlice';
import { theme } from '@/theme';

export function buildTestStore(preloadedAuth?: Partial<AuthState>) {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        accessToken: null,
        refreshToken: null,
        user: null,
        isAuthenticated: false,
        isBootstrapping: false,
        ...preloadedAuth,
      },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  options: { route?: string; preloadedAuth?: Partial<AuthState> } = {},
) {
  const store = buildTestStore(options.preloadedAuth);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const result = render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={[options.route ?? '/']}>{ui}</MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>,
  );

  return { ...result, store, queryClient };
}

import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { PublicRoute } from '@/routes/PublicRoute';

function LoginStub() {
  return <div>Login page</div>;
}
function DashboardStub() {
  return <div>Dashboard page</div>;
}

function TestApp() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginStub />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardStub />} />
      </Route>
    </Routes>
  );
}

describe('ProtectedRoute', () => {
  it('redirects an unauthenticated visitor from /dashboard to /login', () => {
    renderWithProviders(<TestApp />, { route: '/dashboard', preloadedAuth: { isAuthenticated: false } });
    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard page')).not.toBeInTheDocument();
  });

  it('renders the protected content for an authenticated visitor', () => {
    renderWithProviders(<TestApp />, { route: '/dashboard', preloadedAuth: { isAuthenticated: true } });
    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
  });

  it('shows a loading state instead of redirecting while bootstrapping', () => {
    renderWithProviders(<TestApp />, {
      route: '/dashboard',
      preloadedAuth: { isAuthenticated: false, isBootstrapping: true },
    });
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
    expect(screen.queryByText('Dashboard page')).not.toBeInTheDocument();
  });
});

describe('PublicRoute', () => {
  it('redirects an already-authenticated visitor away from /login to /dashboard', () => {
    renderWithProviders(<TestApp />, { route: '/login', preloadedAuth: { isAuthenticated: true } });
    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });

  it('renders the public content for an unauthenticated visitor', () => {
    renderWithProviders(<TestApp />, { route: '/login', preloadedAuth: { isAuthenticated: false } });
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });
});

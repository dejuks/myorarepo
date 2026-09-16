import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { PublicRoute } from '@/routes/PublicRoute';
import { AdminRoute } from '@/routes/AdminRoute';
import { ModuleRoute } from '@/routes/ModuleRoute';
import { UserStatus } from '@/types/domain';
import type { User } from '@/types/domain';

vi.mock('@/api/userApi', async () => {
  const actual = await vi.importActual<typeof import('@/api/userApi')>('@/api/userApi');
  return { ...actual, getMe: vi.fn() };
});
vi.mock('@/api/moduleApi', async () => {
  const actual = await vi.importActual<typeof import('@/api/moduleApi')>('@/api/moduleApi');
  return { ...actual, listMemberRoles: vi.fn() };
});

import { getMe } from '@/api/userApi';
import { listMemberRoles } from '@/api/moduleApi';

function buildUser(roles: string[]): User {
  return {
    id: 'u1',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    displayName: null,
    avatarUrl: null,
    bio: null,
    phone: null,
    locale: 'en',
    status: UserStatus.ACTIVE,
    deactivatedAt: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    roles,
  };
}

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

function AdminStub() {
  return <div>Admin page</div>;
}

function AdminTestApp() {
  return (
    <Routes>
      <Route path="/dashboard" element={<DashboardStub />} />
      <Route element={<AdminRoute />}>
        <Route path="/admin/users" element={<AdminStub />} />
      </Route>
    </Routes>
  );
}

describe('AdminRoute', () => {
  it('renders the admin content once the current user has the ADMIN role', async () => {
    vi.mocked(getMe).mockResolvedValueOnce(buildUser(['USER', 'ADMIN']));
    renderWithProviders(<AdminTestApp />, { route: '/admin/users', preloadedAuth: { isAuthenticated: true } });

    expect(await screen.findByText('Admin page')).toBeInTheDocument();
  });

  it('redirects a non-admin visitor to /dashboard', async () => {
    vi.mocked(getMe).mockResolvedValueOnce(buildUser(['USER']));
    renderWithProviders(<AdminTestApp />, { route: '/admin/users', preloadedAuth: { isAuthenticated: true } });

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
    expect(screen.queryByText('Admin page')).not.toBeInTheDocument();
  });

  it('shows a loading state instead of redirecting while the current user is still loading', async () => {
    let resolveGetMe: (user: User) => void = () => {};
    vi.mocked(getMe).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveGetMe = resolve;
      }),
    );
    renderWithProviders(<AdminTestApp />, { route: '/admin/users', preloadedAuth: { isAuthenticated: true } });

    expect(screen.queryByText('Admin page')).not.toBeInTheDocument();
    expect(screen.queryByText('Dashboard page')).not.toBeInTheDocument();

    resolveGetMe(buildUser(['ADMIN']));
    await waitFor(() => expect(screen.getByText('Admin page')).toBeInTheDocument());
  });
});

function ModuleStub() {
  return <div>Module page</div>;
}

function ModuleTestApp() {
  return (
    <Routes>
      <Route path="/dashboard" element={<DashboardStub />} />
      <Route element={<ModuleRoute />}>
        <Route path="/admin/modules/:moduleKey" element={<ModuleStub />} />
      </Route>
    </Routes>
  );
}

describe('ModuleRoute', () => {
  it('lets a platform ADMIN reach any module dashboard without checking its member-roles endpoint', async () => {
    vi.mocked(getMe).mockResolvedValueOnce(buildUser(['USER', 'ADMIN']));
    renderWithProviders(<ModuleTestApp />, { route: '/admin/modules/journal', preloadedAuth: { isAuthenticated: true } });

    expect(await screen.findByText('Module page')).toBeInTheDocument();
    expect(listMemberRoles).not.toHaveBeenCalled();
  });

  it('lets a user holding that module\'s own top role reach its dashboard', async () => {
    vi.mocked(getMe).mockResolvedValueOnce(buildUser(['USER']));
    vi.mocked(listMemberRoles).mockResolvedValue(['JOURNAL_MANAGER']);
    renderWithProviders(<ModuleTestApp />, { route: '/admin/modules/journal', preloadedAuth: { isAuthenticated: true } });

    expect(await screen.findByText('Module page')).toBeInTheDocument();
  });

  it('redirects a user with neither global ADMIN nor the module top role to /dashboard', async () => {
    vi.mocked(getMe).mockResolvedValueOnce(buildUser(['USER']));
    vi.mocked(listMemberRoles).mockResolvedValue([]);
    renderWithProviders(<ModuleTestApp />, { route: '/admin/modules/journal', preloadedAuth: { isAuthenticated: true } });

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
    expect(screen.queryByText('Module page')).not.toBeInTheDocument();
  });

  it('lets an unrecognized module key render through so the page can show its own "unknown module" error', async () => {
    vi.mocked(getMe).mockResolvedValueOnce(buildUser(['USER']));
    renderWithProviders(<ModuleTestApp />, { route: '/admin/modules/not-a-real-module', preloadedAuth: { isAuthenticated: true } });

    expect(await screen.findByText('Module page')).toBeInTheDocument();
  });
});

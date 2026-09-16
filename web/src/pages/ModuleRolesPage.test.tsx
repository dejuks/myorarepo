import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ModuleRolesPage } from '@/pages/ModuleRolesPage';
import { UserStatus } from '@/types/domain';
import type { Role, User } from '@/types/domain';

vi.mock('@/api/moduleApi', () => ({
  listModuleRoles: vi.fn(),
  createModuleRole: vi.fn(),
  deleteModuleRole: vi.fn(),
  listMemberRoles: vi.fn(),
  assignMemberRole: vi.fn(),
  revokeMemberRole: vi.fn(),
}));
vi.mock('@/api/userApi', async () => {
  const actual = await vi.importActual<typeof import('@/api/userApi')>('@/api/userApi');
  return { ...actual, listUsers: vi.fn() };
});
vi.mock('@/api/authApi', async () => {
  const actual = await vi.importActual<typeof import('@/api/authApi')>('@/api/authApi');
  return { ...actual, createUserProfile: vi.fn(), registerCredentials: vi.fn() };
});

import { listModuleRoles, listMemberRoles } from '@/api/moduleApi';
import { listUsers } from '@/api/userApi';
import { createUserProfile, registerCredentials } from '@/api/authApi';

function buildRole(name: string, isSystem = true): Role {
  return { id: name.toLowerCase(), name, description: `${name} role`, isSystem, createdAt: '2024-01-01T00:00:00.000Z' };
}

function buildUser(id: string): User {
  return {
    id,
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
    roles: ['USER'],
  };
}

function TestApp() {
  return (
    <Routes>
      <Route path="/admin/modules/:moduleKey" element={<ModuleRolesPage />} />
    </Routes>
  );
}

describe('ModuleRolesPage', () => {
  it('shows an error for a module key that is not in the config', async () => {
    renderWithProviders(<TestApp />, { route: '/admin/modules/not-a-real-module', preloadedAuth: { isAuthenticated: true } });
    expect(await screen.findByText(/Unknown module/i)).toBeInTheDocument();
  });

  it('loads and displays the role catalog for a known module', async () => {
    vi.mocked(listModuleRoles).mockResolvedValueOnce([buildRole('JOURNAL_MANAGER'), buildRole('AUTHOR')]);
    vi.mocked(listUsers).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 });

    renderWithProviders(<TestApp />, { route: '/admin/modules/journal', preloadedAuth: { isAuthenticated: true } });

    expect(await screen.findByText('JOURNAL_MANAGER')).toBeInTheDocument();
    expect(screen.getByText('AUTHOR')).toBeInTheDocument();
    expect(screen.getByText(/Journals — Roles & Permissions/)).toBeInTheDocument();
  });

  it('prompts to pick a member before showing member-role controls', async () => {
    vi.mocked(listModuleRoles).mockResolvedValueOnce([buildRole('BOOK_EDITOR')]);
    vi.mocked(listUsers).mockResolvedValue({ items: [buildUser('u1')], total: 1, page: 1, pageSize: 10 });

    renderWithProviders(<TestApp />, { route: '/admin/modules/ebook', preloadedAuth: { isAuthenticated: true } });

    await waitFor(() => expect(screen.getByText(/Search for and select a user/i)).toBeInTheDocument());
  });

  it('creates a platform account and selects it for role assignment', async () => {
    vi.mocked(listModuleRoles).mockResolvedValueOnce([buildRole('BOOK_EDITOR')]);
    vi.mocked(listUsers).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 });
    const created = buildUser('new-user-1');
    vi.mocked(createUserProfile).mockResolvedValueOnce(created);
    vi.mocked(registerCredentials).mockResolvedValueOnce(undefined);
    vi.mocked(listMemberRoles).mockResolvedValue([]);

    const user = userEvent.setup();
    renderWithProviders(<TestApp />, { route: '/admin/modules/ebook', preloadedAuth: { isAuthenticated: true } });

    await screen.findByText('BOOK_EDITOR');
    await user.click(screen.getByRole('button', { name: /create user/i }));

    await screen.findByRole('heading', { name: /create a platform user/i });
    await user.type(screen.getByLabelText(/first name/i), 'Jane');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/^email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'StrongPass1!');
    await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass1!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(createUserProfile).toHaveBeenCalledTimes(1));
    expect(registerCredentials).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('heading', { name: /create a platform user/i })).not.toBeInTheDocument());
    expect(await screen.findByDisplayValue(/Jane Doe/)).toBeInTheDocument();
  });

  it('surfaces a partial-account warning when credentials setup fails after the profile is created', async () => {
    vi.mocked(listModuleRoles).mockResolvedValueOnce([buildRole('BOOK_EDITOR')]);
    vi.mocked(listUsers).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 });
    vi.mocked(createUserProfile).mockResolvedValueOnce(buildUser('new-user-2'));
    vi.mocked(registerCredentials).mockRejectedValueOnce({ message: 'Credentials service unavailable' });

    const user = userEvent.setup();
    renderWithProviders(<TestApp />, { route: '/admin/modules/ebook', preloadedAuth: { isAuthenticated: true } });

    await screen.findByText('BOOK_EDITOR');
    await user.click(screen.getByRole('button', { name: /create user/i }));
    await screen.findByRole('heading', { name: /create a platform user/i });
    await user.type(screen.getByLabelText(/first name/i), 'Jane');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/^email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'StrongPass1!');
    await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass1!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/credentials setup didn.t finish/i)).toBeInTheDocument();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
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

import { listModuleRoles } from '@/api/moduleApi';
import { listUsers } from '@/api/userApi';

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
});

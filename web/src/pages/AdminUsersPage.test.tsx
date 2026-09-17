import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminUsersPage } from '@/pages/AdminUsersPage';
import { CreateUserPage } from '@/pages/CreateUserPage';
import { UserStatus } from '@/types/domain';
import type { User } from '@/types/domain';

vi.mock('@/api/userApi', async () => {
  const actual = await vi.importActual<typeof import('@/api/userApi')>('@/api/userApi');
  return { ...actual, listUsers: vi.fn() };
});
vi.mock('@/api/authApi', async () => {
  const actual = await vi.importActual<typeof import('@/api/authApi')>('@/api/authApi');
  return { ...actual, createUserProfile: vi.fn(), registerCredentials: vi.fn() };
});

import { listUsers } from '@/api/userApi';
import { createUserProfile, registerCredentials } from '@/api/authApi';

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
    gender: null,
    dateOfBirth: null,
    address: null,
    country: null,
    region: null,
    city: null,
    timezone: null,
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
      <Route path="/admin/users" element={<AdminUsersPage />} />
      <Route path="/admin/users/new" element={<CreateUserPage />} />
      <Route path="/admin/users/:id" element={<div>User detail page</div>} />
    </Routes>
  );
}

describe('AdminUsersPage', () => {
  it('navigates to the full-page create-user form from the header button and to the new user on success', async () => {
    vi.mocked(listUsers).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    const created = buildUser('new-user-1');
    vi.mocked(createUserProfile).mockResolvedValueOnce(created);
    vi.mocked(registerCredentials).mockResolvedValueOnce(undefined);

    const user = userEvent.setup();
    renderWithProviders(<TestApp />, { route: '/admin/users', preloadedAuth: { isAuthenticated: true } });

    await screen.findByRole('heading', { name: 'Users' });
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
    expect(await screen.findByText('User detail page')).toBeInTheDocument();
  });
});

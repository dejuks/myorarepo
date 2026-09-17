import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { RolePermissionsPage } from '@/pages/RolePermissionsPage';
import type { Role } from '@/types/domain';

vi.mock('@/api/userApi', () => ({
  listRoles: vi.fn(),
  listPermissions: vi.fn(),
  getRolePermissions: vi.fn(),
  setRolePermissions: vi.fn(),
}));

import { getRolePermissions, listPermissions, listRoles, setRolePermissions } from '@/api/userApi';

const RESEARCHER_ROLE: Role = {
  id: 'role-researcher',
  name: 'RESEARCHER',
  description: 'Researcher / author',
  isSystem: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const CATALOG = [
  { id: 'p1', key: 'users.view', category: 'User Management', label: 'View users', description: null, createdAt: '2026-01-01T00:00:00.000Z' },
  {
    id: 'p2',
    key: 'users.manage',
    category: 'User Management',
    label: 'Manage users',
    description: 'Edit, suspend, deactivate',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  { id: 'p3', key: 'roles.assign', category: 'Role Management', label: 'Assign roles', description: null, createdAt: '2026-01-01T00:00:00.000Z' },
];

function TestApp() {
  return (
    <Routes>
      <Route path="/admin/roles/:id/permissions" element={<RolePermissionsPage />} />
    </Routes>
  );
}

describe('RolePermissionsPage', () => {
  it('shows grouped checkboxes with the role\'s currently granted permissions checked', async () => {
    vi.mocked(listRoles).mockResolvedValue([RESEARCHER_ROLE]);
    vi.mocked(listPermissions).mockResolvedValueOnce(CATALOG);
    vi.mocked(getRolePermissions).mockResolvedValueOnce({ role: RESEARCHER_ROLE, permissionKeys: ['users.view'] });

    renderWithProviders(<TestApp />, { route: '/admin/roles/role-researcher/permissions', preloadedAuth: { isAuthenticated: true } });

    await screen.findByRole('heading', { name: /RESEARCHER/i });
    expect(await screen.findByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Role Management')).toBeInTheDocument();

    const viewUsers = screen.getByTestId('permission-checkbox-users.view').querySelector('input') as HTMLInputElement;
    const manageUsers = screen.getByTestId('permission-checkbox-users.manage').querySelector('input') as HTMLInputElement;
    expect(viewUsers).toBeChecked();
    expect(manageUsers).not.toBeChecked();
  });

  it('saves the currently checked permission keys, applying immediately', async () => {
    vi.mocked(listRoles).mockResolvedValue([RESEARCHER_ROLE]);
    vi.mocked(listPermissions).mockResolvedValueOnce(CATALOG);
    vi.mocked(getRolePermissions).mockResolvedValueOnce({ role: RESEARCHER_ROLE, permissionKeys: ['users.view'] });
    vi.mocked(setRolePermissions).mockResolvedValueOnce({
      role: RESEARCHER_ROLE,
      permissionKeys: ['users.view', 'roles.assign'],
    });

    const user = userEvent.setup();
    renderWithProviders(<TestApp />, { route: '/admin/roles/role-researcher/permissions', preloadedAuth: { isAuthenticated: true } });

    const assignRoles = await screen.findByTestId('permission-checkbox-roles.assign');
    await user.click(assignRoles.querySelector('input') as HTMLInputElement);

    await user.click(screen.getByRole('button', { name: /save permissions/i }));

    await waitFor(() => expect(setRolePermissions).toHaveBeenCalledWith('role-researcher', ['users.view', 'roles.assign']));
    expect(await screen.findByTestId('role-permissions-saved')).toBeInTheDocument();
  });

  it('surfaces an error if saving fails', async () => {
    vi.mocked(listRoles).mockResolvedValue([RESEARCHER_ROLE]);
    vi.mocked(listPermissions).mockResolvedValueOnce(CATALOG);
    vi.mocked(getRolePermissions).mockResolvedValueOnce({ role: RESEARCHER_ROLE, permissionKeys: [] });
    vi.mocked(setRolePermissions).mockRejectedValueOnce({ message: 'Insufficient permissions' });

    const user = userEvent.setup();
    renderWithProviders(<TestApp />, { route: '/admin/roles/role-researcher/permissions', preloadedAuth: { isAuthenticated: true } });

    await screen.findByText('User Management');
    await user.click(screen.getByRole('button', { name: /save permissions/i }));

    expect(await screen.findByText(/insufficient permissions/i)).toBeInTheDocument();
  });

  it('shows an error when the role id in the URL no longer matches any role', async () => {
    vi.mocked(listRoles).mockResolvedValue([]);
    vi.mocked(listPermissions).mockResolvedValueOnce(CATALOG);
    vi.mocked(getRolePermissions).mockResolvedValueOnce({ role: RESEARCHER_ROLE, permissionKeys: [] });

    renderWithProviders(<TestApp />, { route: '/admin/roles/does-not-exist/permissions', preloadedAuth: { isAuthenticated: true } });

    expect(await screen.findByText(/this role no longer exists/i)).toBeInTheDocument();
  });
});

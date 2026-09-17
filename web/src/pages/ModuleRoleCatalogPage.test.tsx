import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ModuleRoleCatalogPage } from '@/pages/ModuleRoleCatalogPage';
import type { Role } from '@/types/domain';

vi.mock('@/api/moduleApi', () => ({
  listModuleRoles: vi.fn(),
  createModuleRole: vi.fn(),
  deleteModuleRole: vi.fn(),
}));

import { listModuleRoles } from '@/api/moduleApi';

function buildRole(name: string, isSystem = true): Role {
  return { id: name.toLowerCase(), name, description: `${name} role`, isSystem, createdAt: '2024-01-01T00:00:00.000Z' };
}

function TestApp() {
  return (
    <Routes>
      <Route path="/admin/modules/:moduleKey/roles" element={<ModuleRoleCatalogPage />} />
    </Routes>
  );
}

describe('ModuleRoleCatalogPage', () => {
  it('shows an error for a module key that is not in the config', async () => {
    renderWithProviders(<TestApp />, { route: '/admin/modules/not-a-real-module/roles', preloadedAuth: { isAuthenticated: true } });
    expect(await screen.findByText(/Unknown module/i)).toBeInTheDocument();
  });

  it('loads and displays the role catalog for a known module', async () => {
    vi.mocked(listModuleRoles).mockResolvedValueOnce([buildRole('JOURNAL_MANAGER'), buildRole('AUTHOR')]);

    renderWithProviders(<TestApp />, { route: '/admin/modules/journal/roles', preloadedAuth: { isAuthenticated: true } });

    expect(await screen.findByText('JOURNAL_MANAGER')).toBeInTheDocument();
    expect(screen.getByText('AUTHOR')).toBeInTheDocument();
    expect(screen.getByText(/Journals — Roles & Permissions/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /role catalog/i })).toHaveAttribute('aria-selected', 'true');
  });
});

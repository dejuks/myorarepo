import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { WikiArticleEditPage } from '@/pages/WikiArticleEditPage';
import { UserStatus } from '@/types/domain';
import type { User } from '@/types/domain';

vi.mock('@/api/wikiApi', async () => {
  const actual = await vi.importActual<typeof import('@/api/wikiApi')>('@/api/wikiApi');
  return { ...actual, getMyWikiRoles: vi.fn(), listCategories: vi.fn(), listTags: vi.fn() };
});
vi.mock('@/api/userApi', async () => {
  const actual = await vi.importActual<typeof import('@/api/userApi')>('@/api/userApi');
  return { ...actual, getMe: vi.fn() };
});

import { getMyWikiRoles, listCategories, listTags } from '@/api/wikiApi';
import { getMe } from '@/api/userApi';

function buildUser(id: string, roles: string[]): User {
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
    roles,
  };
}

function TestApp() {
  return (
    <Routes>
      <Route path="/wiki" element={<div>Wiki list page</div>} />
      <Route path="/wiki/new" element={<WikiArticleEditPage />} />
    </Routes>
  );
}

describe('WikiArticleEditPage — editor gate', () => {
  it('renders the form for a user holding the REGISTERED_EDITOR wiki role', async () => {
    vi.mocked(getMe).mockResolvedValue(buildUser('u1', ['USER']));
    vi.mocked(getMyWikiRoles).mockResolvedValue(['REGISTERED_EDITOR']);
    vi.mocked(listCategories).mockResolvedValue([]);
    vi.mocked(listTags).mockResolvedValue([]);

    renderWithProviders(<TestApp />, { route: '/wiki/new', preloadedAuth: { isAuthenticated: true } });

    await screen.findByRole('heading', { name: /new article/i });
  });

  it('renders the form for a platform ADMIN with no wiki role assignment', async () => {
    vi.mocked(getMe).mockResolvedValue(buildUser('u1', ['ADMIN']));
    vi.mocked(getMyWikiRoles).mockResolvedValue([]);
    vi.mocked(listCategories).mockResolvedValue([]);
    vi.mocked(listTags).mockResolvedValue([]);

    renderWithProviders(<TestApp />, { route: '/wiki/new', preloadedAuth: { isAuthenticated: true } });

    await screen.findByRole('heading', { name: /new article/i });
  });

  it('redirects a plain platform user with no wiki role back to the wiki list', async () => {
    vi.mocked(getMe).mockResolvedValue(buildUser('u1', ['USER']));
    vi.mocked(getMyWikiRoles).mockResolvedValue([]);
    vi.mocked(listCategories).mockResolvedValue([]);
    vi.mocked(listTags).mockResolvedValue([]);

    renderWithProviders(<TestApp />, { route: '/wiki/new', preloadedAuth: { isAuthenticated: true } });

    await screen.findByText('Wiki list page');
    expect(screen.queryByRole('heading', { name: /new article/i })).not.toBeInTheDocument();
  });
});

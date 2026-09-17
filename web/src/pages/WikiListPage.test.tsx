import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { WikiListPage } from '@/pages/WikiListPage';
import { UserStatus } from '@/types/domain';
import type { Article, User } from '@/types/domain';

vi.mock('@/api/wikiApi', async () => {
  const actual = await vi.importActual<typeof import('@/api/wikiApi')>('@/api/wikiApi');
  return { ...actual, listArticles: vi.fn(), getMyWikiRoles: vi.fn() };
});
vi.mock('@/api/userApi', async () => {
  const actual = await vi.importActual<typeof import('@/api/userApi')>('@/api/userApi');
  return { ...actual, getMe: vi.fn() };
});

import { listArticles, getMyWikiRoles } from '@/api/wikiApi';
import { getMe } from '@/api/userApi';

function buildArticle(id: string, title: string, slug: string): Article {
  return {
    id,
    title,
    slug,
    summary: null,
    language: 'om',
    categoryId: null,
    featuredImageUrl: null,
    status: 'PUBLISHED',
    publishedAt: '2026-01-02T00:00:00.000Z',
    createdBy: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  };
}

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
      <Route path="/wiki" element={<WikiListPage />} />
      <Route path="/wiki/:slug" element={<div>Article detail page</div>} />
      <Route path="/wiki/new" element={<div>New article page</div>} />
    </Routes>
  );
}

describe('WikiListPage', () => {
  it('lists articles and links to each one by slug', async () => {
    vi.mocked(getMe).mockResolvedValue(buildUser('u1', ['USER']));
    vi.mocked(getMyWikiRoles).mockResolvedValue([]);
    vi.mocked(listArticles).mockResolvedValue({
      items: [buildArticle('a1', 'Gadaa System', 'gadaa-system')],
      total: 1,
      page: 1,
      pageSize: 20,
    });

    const user = userEvent.setup();
    renderWithProviders(<TestApp />, { route: '/wiki', preloadedAuth: { isAuthenticated: true } });

    await screen.findByRole('heading', { name: 'Oromo Wikipedia' });
    await screen.findByText('Gadaa System');

    await user.click(screen.getByText('Gadaa System'));
    await screen.findByText('Article detail page');
  });

  it('shows an empty state when there are no articles', async () => {
    vi.mocked(getMe).mockResolvedValue(buildUser('u1', ['USER']));
    vi.mocked(getMyWikiRoles).mockResolvedValue([]);
    vi.mocked(listArticles).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });

    renderWithProviders(<TestApp />, { route: '/wiki', preloadedAuth: { isAuthenticated: true } });

    await screen.findByText(/no articles yet/i);
  });

  it('navigates to the new-article page from the header button, for a user holding the REGISTERED_EDITOR wiki role', async () => {
    vi.mocked(getMe).mockResolvedValue(buildUser('u1', ['USER']));
    vi.mocked(getMyWikiRoles).mockResolvedValue(['REGISTERED_EDITOR']);
    vi.mocked(listArticles).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });

    const user = userEvent.setup();
    renderWithProviders(<TestApp />, { route: '/wiki', preloadedAuth: { isAuthenticated: true } });

    await screen.findByRole('heading', { name: 'Oromo Wikipedia' });
    await waitFor(() => expect(screen.getByRole('link', { name: /new article/i })).toBeInTheDocument());
    await user.click(screen.getByRole('link', { name: /new article/i }));
    await screen.findByText('New article page');
  });

  it('hides the "New article" button for a plain platform user with no wiki role', async () => {
    vi.mocked(getMe).mockResolvedValue(buildUser('u1', ['USER']));
    vi.mocked(getMyWikiRoles).mockResolvedValue([]);
    vi.mocked(listArticles).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });

    renderWithProviders(<TestApp />, { route: '/wiki', preloadedAuth: { isAuthenticated: true } });

    await screen.findByRole('heading', { name: 'Oromo Wikipedia' });
    await waitFor(() => expect(getMyWikiRoles).toHaveBeenCalled());
    expect(screen.queryByRole('link', { name: /new article/i })).not.toBeInTheDocument();
  });
});

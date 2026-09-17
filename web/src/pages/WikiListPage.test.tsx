import { describe, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/renderWithProviders';
import { WikiListPage } from '@/pages/WikiListPage';
import type { Article } from '@/types/domain';

vi.mock('@/api/wikiApi', async () => {
  const actual = await vi.importActual<typeof import('@/api/wikiApi')>('@/api/wikiApi');
  return { ...actual, listArticles: vi.fn() };
});

import { listArticles } from '@/api/wikiApi';

function buildArticle(id: string, title: string, slug: string): Article {
  return {
    id,
    title,
    slug,
    createdBy: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
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
    vi.mocked(listArticles).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });

    renderWithProviders(<TestApp />, { route: '/wiki', preloadedAuth: { isAuthenticated: true } });

    await screen.findByText(/no articles yet/i);
  });

  it('navigates to the new-article page from the header button', async () => {
    vi.mocked(listArticles).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });

    const user = userEvent.setup();
    renderWithProviders(<TestApp />, { route: '/wiki', preloadedAuth: { isAuthenticated: true } });

    await screen.findByRole('heading', { name: 'Oromo Wikipedia' });
    await user.click(screen.getByRole('link', { name: /new article/i }));
    await screen.findByText('New article page');
  });
});

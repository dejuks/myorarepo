import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { PlatformSettingsPage } from '@/pages/PlatformSettingsPage';

vi.mock('@/api/authApi', () => ({
  getPlatformSettings: vi.fn(),
  updatePlatformSettings: vi.fn(),
}));

import { getPlatformSettings, updatePlatformSettings } from '@/api/authApi';

describe('PlatformSettingsPage', () => {
  it('shows the current requireEmailVerification value', async () => {
    vi.mocked(getPlatformSettings).mockResolvedValueOnce({
      requireEmailVerification: true,
      updatedAt: '2026-01-01T00:00:00.000Z',
      updatedBy: null,
    });

    renderWithProviders(<PlatformSettingsPage />, { route: '/admin/settings' });

    const toggle = await screen.findByTestId('require-email-verification-switch');
    expect(toggle.querySelector('input')).toBeChecked();
  });

  it('lets the admin flip the toggle off, applying immediately', async () => {
    vi.mocked(getPlatformSettings).mockResolvedValueOnce({
      requireEmailVerification: true,
      updatedAt: '2026-01-01T00:00:00.000Z',
      updatedBy: null,
    });
    vi.mocked(updatePlatformSettings).mockResolvedValueOnce({
      requireEmailVerification: false,
      updatedAt: '2026-01-02T00:00:00.000Z',
      updatedBy: 'admin-1',
    });

    const user = userEvent.setup();
    renderWithProviders(<PlatformSettingsPage />, { route: '/admin/settings' });

    const toggle = await screen.findByTestId('require-email-verification-switch');
    await user.click(toggle.querySelector('input') as HTMLInputElement);

    await waitFor(() => expect(updatePlatformSettings).toHaveBeenCalledWith(false));
    expect(await screen.findByTestId('settings-saved')).toBeInTheDocument();
    expect(toggle.querySelector('input')).not.toBeChecked();
  });

  it('surfaces an error if saving the setting fails', async () => {
    vi.mocked(getPlatformSettings).mockResolvedValueOnce({
      requireEmailVerification: true,
      updatedAt: '2026-01-01T00:00:00.000Z',
      updatedBy: null,
    });
    vi.mocked(updatePlatformSettings).mockRejectedValueOnce({ message: 'Insufficient permissions' });

    const user = userEvent.setup();
    renderWithProviders(<PlatformSettingsPage />, { route: '/admin/settings' });

    const toggle = await screen.findByTestId('require-email-verification-switch');
    await user.click(toggle.querySelector('input') as HTMLInputElement);

    expect(await screen.findByText(/insufficient permissions/i)).toBeInTheDocument();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';

vi.mock('@/api/authApi', () => ({
  verifyEmail: vi.fn(),
  resendVerificationEmail: vi.fn(),
}));

import { verifyEmail, resendVerificationEmail } from '@/api/authApi';

describe('VerifyEmailPage', () => {
  it('shows a warning and the resend form when no token is present in the link', async () => {
    renderWithProviders(<VerifyEmailPage />, { route: '/verify-email' });

    expect(await screen.findByText(/no verification token found/i)).toBeInTheDocument();
    expect(verifyEmail).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument();
  });

  it('automatically submits the token from the link and shows success', async () => {
    vi.mocked(verifyEmail).mockResolvedValueOnce(undefined);
    renderWithProviders(<VerifyEmailPage />, { route: '/verify-email?token=abc123' });

    await waitFor(() => expect(verifyEmail).toHaveBeenCalledWith('abc123'));
    expect(await screen.findByTestId('verify-success')).toHaveTextContent(/you can now log in/i);
    expect(screen.getByRole('link', { name: /go to sign in/i })).toBeInTheDocument();
  });

  it('shows an error and the resend form when the token is invalid or expired', async () => {
    vi.mocked(verifyEmail).mockRejectedValueOnce({ message: 'Verification link is invalid or has expired' });
    renderWithProviders(<VerifyEmailPage />, { route: '/verify-email?token=bad-token' });

    expect(await screen.findByTestId('verify-error')).toHaveTextContent(/invalid or has expired/i);
    expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument();
  });

  it('lets the visitor request a new verification email', async () => {
    vi.mocked(verifyEmail).mockRejectedValueOnce({ message: 'Verification link is invalid or has expired' });
    vi.mocked(resendVerificationEmail).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    renderWithProviders(<VerifyEmailPage />, { route: '/verify-email?token=bad-token' });

    await screen.findByTestId('verify-error');
    await user.type(screen.getByLabelText(/email/i), 'pending@example.com');
    await user.click(screen.getByRole('button', { name: /resend verification email/i }));

    await waitFor(() => expect(resendVerificationEmail).toHaveBeenCalledWith('pending@example.com'));
    expect(await screen.findByText(/a new verification link has been sent/i)).toBeInTheDocument();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { LoginPage } from '@/pages/LoginPage';

vi.mock('@/api/authApi', () => ({
  login: vi.fn(),
}));

import { login } from '@/api/authApi';

describe('LoginPage validation', () => {
  it('shows required-field errors when submitting an empty form', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, { route: '/login' });

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('rejects an invalid email address without calling the API', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, { route: '/login' });

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/^password/i), 'somepassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('submits valid credentials and surfaces a backend error message verbatim', async () => {
    vi.mocked(login).mockRejectedValueOnce({ message: 'This account is temporarily locked. Try again later.' });
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />, { route: '/login' });

    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'StrongPass1!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith(
        { email: 'jane@example.com', password: 'StrongPass1!' },
        expect.anything(),
      ),
    );
    expect(await screen.findByTestId('login-error')).toHaveTextContent(/temporarily locked/i);
  });
});

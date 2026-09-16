import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { RegisterPage } from '@/pages/RegisterPage';

vi.mock('@/api/authApi', () => ({
  createUserProfile: vi.fn(),
  registerCredentials: vi.fn(),
}));

import { createUserProfile, registerCredentials } from '@/api/authApi';

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/first name/i), 'Jane');
  await user.type(screen.getByLabelText(/last name/i), 'Doe');
  await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
}

describe('RegisterPage validation', () => {
  it('shows required-field errors on an empty submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />, { route: '/register' });

    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/^password is required$/i)).toBeInTheDocument();
    expect(createUserProfile).not.toHaveBeenCalled();
  });

  it('rejects a password that fails the policy', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />, { route: '/register' });

    await fillRequiredFields(user);
    await user.type(screen.getByLabelText(/^password/i), 'weakpassword');
    await user.type(screen.getByLabelText(/confirm password/i), 'weakpassword');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/uppercase, lowercase, a digit, and a special character/i)).toBeInTheDocument();
    expect(createUserProfile).not.toHaveBeenCalled();
  });

  it('rejects mismatched password confirmation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />, { route: '/register' });

    await fillRequiredFields(user);
    await user.type(screen.getByLabelText(/^password/i), 'StrongPass1!');
    await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPass1!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(createUserProfile).not.toHaveBeenCalled();
  });

  it('runs the two-step registration flow with a shared userId on valid input', async () => {
    vi.mocked(createUserProfile).mockResolvedValueOnce({
      id: 'generated-id',
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
    } as never);
    vi.mocked(registerCredentials).mockResolvedValueOnce(undefined);

    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />, { route: '/register' });

    await fillRequiredFields(user);
    await user.type(screen.getByLabelText(/^password/i), 'StrongPass1!');
    await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass1!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await vi.waitFor(() => expect(createUserProfile).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(registerCredentials).toHaveBeenCalledTimes(1));

    const profileCallArg = vi.mocked(createUserProfile).mock.calls[0][0];
    const credentialsCallArg = vi.mocked(registerCredentials).mock.calls[0][0];
    expect(credentialsCallArg.userId).toBe(profileCallArg.id);
    expect(credentialsCallArg.email).toBe('jane@example.com');
  });

  it('shows a distinct warning when step 1 succeeds but step 2 fails', async () => {
    vi.mocked(createUserProfile).mockResolvedValueOnce({
      id: 'generated-id',
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
    } as never);
    vi.mocked(registerCredentials).mockRejectedValueOnce({ message: 'Email already registered' });

    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />, { route: '/register' });

    await fillRequiredFields(user);
    await user.type(screen.getByLabelText(/^password/i), 'StrongPass1!');
    await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass1!');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByTestId('partial-account-warning')).toHaveTextContent(/contact support/i);
  });
});

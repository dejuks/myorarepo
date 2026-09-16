import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';

vi.mock('@/api/authApi', () => ({
  changePassword: vi.fn(),
}));

import { changePassword } from '@/api/authApi';

describe('ChangePasswordDialog validation', () => {
  it('shows required-field errors on an empty submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangePasswordDialog open onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText(/current password is required/i)).toBeInTheDocument();
    expect(screen.getByText(/new password is required/i)).toBeInTheDocument();
    expect(screen.getByText(/please confirm your new password/i)).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('rejects a new password that fails the policy', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangePasswordDialog open onClose={() => {}} />);

    await user.type(screen.getByLabelText(/current password/i), 'OldPassw0rd!');
    await user.type(screen.getByLabelText(/^new password/i), 'weakpassword');
    await user.type(screen.getByLabelText(/confirm new password/i), 'weakpassword');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText(/uppercase, lowercase, a digit, and a special character/i)).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('rejects a mismatched confirmation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChangePasswordDialog open onClose={() => {}} />);

    await user.type(screen.getByLabelText(/current password/i), 'OldPassw0rd!');
    await user.type(screen.getByLabelText(/^new password/i), 'StrongPass1!');
    await user.type(screen.getByLabelText(/confirm new password/i), 'DifferentPass1!');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('submits with the current and new password on valid input', async () => {
    vi.mocked(changePassword).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    renderWithProviders(<ChangePasswordDialog open onClose={() => {}} />);

    await user.type(screen.getByLabelText(/current password/i), 'OldPassw0rd!');
    await user.type(screen.getByLabelText(/^new password/i), 'StrongPass1!');
    await user.type(screen.getByLabelText(/confirm new password/i), 'StrongPass1!');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    await vi.waitFor(() => expect(changePassword).toHaveBeenCalledTimes(1));
    expect(changePassword).toHaveBeenCalledWith({ currentPassword: 'OldPassw0rd!', newPassword: 'StrongPass1!' });
    expect(await screen.findByText(/password changed/i)).toBeInTheDocument();
  });

  it('surfaces the backend error message when the current password is wrong', async () => {
    vi.mocked(changePassword).mockRejectedValueOnce({ message: 'Current password is incorrect' });
    const user = userEvent.setup();
    renderWithProviders(<ChangePasswordDialog open onClose={() => {}} />);

    await user.type(screen.getByLabelText(/current password/i), 'WrongPassw0rd!');
    await user.type(screen.getByLabelText(/^new password/i), 'StrongPass1!');
    await user.type(screen.getByLabelText(/confirm new password/i), 'StrongPass1!');
    await user.click(screen.getByRole('button', { name: /change password/i }));

    expect(await screen.findByText(/current password is incorrect/i)).toBeInTheDocument();
  });
});

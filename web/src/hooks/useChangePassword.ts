import { useMutation } from '@tanstack/react-query';
import { changePassword, type ChangePasswordPayload } from '@/api/authApi';

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => changePassword(payload),
  });
}

import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { CreateUserForm } from '@/components/CreateUserForm';
import type { User } from '@/types/domain';

export interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called once the account is fully created (both steps succeeded). The dialog closes itself before this fires. */
  onCreated: (user: User) => void;
  /**
   * Short phrase describing where this account will be usable, shown under
   * the dialog title — e.g. "in Journals" from a module dashboard. Omit for
   * the platform-wide admin Users page, where the default copy already
   * says "across the whole platform".
   */
  scopeLabel?: string;
}

/**
 * Compact modal used by each module's own Roles dashboard ("module admin"
 * — that module's own top role, or platform ADMIN). The platform-wide
 * Admin → Users page uses the full-page CreateUserPage instead (see
 * routes/App.tsx `/admin/users/new`) — both render the same CreateUserForm,
 * just in different chrome, so there's one place the actual field/
 * validation/mutation logic lives. This component itself does not re-check
 * permissions — its call site gates who can open it via its own route
 * guard (AdminRoute / ModuleRoute).
 */
export function CreateUserDialog({ open, onClose, onCreated, scopeLabel }: CreateUserDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Create a platform user</DialogTitle>
      <DialogContent>
        {/* MUI's Dialog unmounts its children when closed (no keepMounted), so this
            remounts fresh — and its state resets — every time the dialog reopens. */}
        <CreateUserForm
          scopeLabel={scopeLabel}
          onCreated={(user) => {
            onClose();
            onCreated(user);
          }}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

export default CreateUserDialog;

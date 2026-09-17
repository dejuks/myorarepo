import { useState } from 'react';
import { useParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import type { SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CreateUserDialog } from '@/components/CreateUserDialog';
import { ModuleSectionTabs } from '@/components/ModuleSectionTabs';
import { getModule } from '@/config/modules';
import { useUsers } from '@/hooks/useUsers';
import { useModuleRoles } from '@/hooks/useModuleRoles';
import { useModuleMemberRoles, useAssignMemberRole, useRevokeMemberRole } from '@/hooks/useModuleMemberRoles';
import type { ApiErrorInfo } from '@/types/api';
import type { User } from '@/types/domain';

/**
 * A module's member-role assignments — look up any platform user (module
 * services have no local user directory of their own, only user-service
 * does) and manage which of this module's roles they hold, plus a "Create
 * user" shortcut for provisioning a brand-new account to then assign a
 * role to. Split out of what used to be a single two-panel ModuleRolesPage
 * so this gets its own full working area instead of a cramped half-page
 * panel; see ModuleRoleCatalogPage for the role catalog itself.
 *
 * Assigning/revoking an EXISTING role to a member, and creating new
 * platform user accounts, stays with the module's own top role (see each
 * module's README) — and a global ADMIN automatically also passes these
 * checks in every module, with no module-local role assignment needed.
 */
export function ModuleMembersPage() {
  const { moduleKey } = useParams<{ moduleKey: string }>();
  const mod = getModule(moduleKey);

  const rolesQuery = useModuleRoles(mod);

  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [roleToAdd, setRoleToAdd] = useState('');
  const [memberRoleError, setMemberRoleError] = useState<string | null>(null);
  const [memberRoleToRevoke, setMemberRoleToRevoke] = useState<string | null>(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);

  const memberSearchQuery = useUsers({ search: memberSearch || undefined, page: 1, pageSize: 10 });
  const memberRolesQuery = useModuleMemberRoles(mod, selectedMember?.id);
  const assignMemberRoleMutation = useAssignMemberRole(mod, selectedMember?.id);
  const revokeMemberRoleMutation = useRevokeMemberRole(mod, selectedMember?.id);

  if (!mod) {
    return <Alert severity="error">Unknown module "{moduleKey}".</Alert>;
  }

  function handleAddMemberRole() {
    setMemberRoleError(null);
    if (!roleToAdd) return;
    assignMemberRoleMutation.mutate(roleToAdd, {
      onSuccess: () => setRoleToAdd(''),
      onError: (error) => setMemberRoleError((error as ApiErrorInfo).message || 'Could not assign this role.'),
    });
  }

  function confirmRevokeMemberRole() {
    if (!memberRoleToRevoke) return;
    setMemberRoleError(null);
    revokeMemberRoleMutation.mutate(memberRoleToRevoke, {
      onSettled: () => setMemberRoleToRevoke(null),
      onError: (error) => setMemberRoleError((error as ApiErrorInfo).message || 'Could not revoke this role.'),
    });
  }

  const memberRoles = memberRolesQuery.data ?? [];
  const assignableRoles = (rolesQuery.data ?? []).filter((role) => !memberRoles.includes(role.name));

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {mod.label} — Roles &amp; Permissions
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Standalone to this module — assigning a role here has no effect anywhere else on the platform, and vice
        versa. See <code>docs/01-architecture.md</code> §2a.
      </Typography>

      <ModuleSectionTabs moduleKey={mod.key} active="members" />

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">Member roles</Typography>
          <Button size="small" variant="outlined" onClick={() => setCreateUserOpen(true)}>
            Create user
          </Button>
        </Stack>
        <Autocomplete
          options={memberSearchQuery.data?.items ?? []}
          loading={memberSearchQuery.isLoading}
          value={selectedMember}
          onChange={(_e, value) => {
            setSelectedMember(value);
            setMemberRoleError(null);
          }}
          onInputChange={(_e, value) => setMemberSearch(value)}
          getOptionLabel={(user) => `${user.firstName} ${user.lastName} (${user.email})`}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          renderInput={(params) => <TextField {...params} label="Find a platform user" placeholder="Name or email" size="small" />}
          sx={{ mb: 2, maxWidth: 480 }}
        />

        {!selectedMember && (
          <Alert severity="info">Search for and select a user to view or manage their roles in {mod.label}.</Alert>
        )}

        {selectedMember && (
          <>
            {memberRoleError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {memberRoleError}
              </Alert>
            )}

            {memberRolesQuery.isLoading && (
              <Box display="flex" justifyContent="center" mt={2}>
                <CircularProgress size={28} />
              </Box>
            )}

            {memberRolesQuery.isError && (
              <Alert severity="error">
                {(memberRolesQuery.error as ApiErrorInfo)?.message || `Could not load this member's roles.`}
              </Alert>
            )}

            {memberRolesQuery.data && (
              <>
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                  {memberRoles.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No roles in {mod.label} yet.
                    </Typography>
                  )}
                  {memberRoles.map((roleName) => (
                    <Chip
                      key={roleName}
                      label={roleName}
                      onDelete={() => setMemberRoleToRevoke(roleName)}
                      disabled={revokeMemberRoleMutation.isPending}
                    />
                  ))}
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                  <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel id="add-member-role-label">Add role</InputLabel>
                    <Select
                      labelId="add-member-role-label"
                      label="Add role"
                      value={roleToAdd}
                      onChange={(e: SelectChangeEvent) => setRoleToAdd(e.target.value)}
                      disabled={assignableRoles.length === 0}
                    >
                      {assignableRoles.map((role) => (
                        <MenuItem key={role.id} value={role.name}>
                          {role.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    variant="outlined"
                    onClick={handleAddMemberRole}
                    disabled={!roleToAdd || assignMemberRoleMutation.isPending}
                  >
                    {assignMemberRoleMutation.isPending ? 'Adding…' : 'Add role'}
                  </Button>
                </Stack>
              </>
            )}
          </>
        )}
      </Paper>

      <CreateUserDialog
        open={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        scopeLabel={`across the whole platform — not just ${mod.label}`}
        onCreated={(createdUser) => {
          setSelectedMember(createdUser);
          setMemberSearch('');
        }}
      />

      <ConfirmDialog
        open={Boolean(memberRoleToRevoke)}
        title="Revoke role"
        message={`Remove the "${memberRoleToRevoke ?? ''}" role from ${selectedMember?.firstName ?? 'this member'} in ${mod.label}?`}
        confirmLabel="Revoke"
        loading={revokeMemberRoleMutation.isPending}
        onConfirm={confirmRevokeMemberRole}
        onCancel={() => setMemberRoleToRevoke(null)}
      />
    </Box>
  );
}

export default ModuleMembersPage;

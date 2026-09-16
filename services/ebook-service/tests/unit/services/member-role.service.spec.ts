import { MemberRoleService } from '@application/services/member-role.service';
import { FakeRoleRepository, FakeUserRoleAssignmentRepository } from './fakes';

describe('MemberRoleService', () => {
  let roleRepo: FakeRoleRepository;
  let userRoleRepo: FakeUserRoleAssignmentRepository;
  let memberRoleService: MemberRoleService;

  beforeEach(() => {
    roleRepo = new FakeRoleRepository();
    roleRepo.seed(['BOOK_EDITOR', 'DIGITAL_CONTENT_MANAGER', 'FINANCE_OPERATIONS_OFFICER', 'AUTHOR_RESEARCHER']);
    userRoleRepo = new FakeUserRoleAssignmentRepository(roleRepo);
    memberRoleService = new MemberRoleService(roleRepo, userRoleRepo);
  });

  describe('listRolesForUser', () => {
    it('returns an empty list for a member with no roles', async () => {
      const roles = await memberRoleService.listRolesForUser('user-1');
      expect(roles).toEqual([]);
    });

    it('lists every role assigned to a member', async () => {
      const editorRole = (await roleRepo.listAll()).find((r) => r.name === 'BOOK_EDITOR')!;
      await userRoleRepo.assign('user-1', editorRole.id, null);

      const roles = await memberRoleService.listRolesForUser('user-1');
      expect(roles).toEqual(['BOOK_EDITOR']);
    });
  });

  describe('assignRole', () => {
    it('assigns a role to a member and returns their updated role list', async () => {
      const roles = await memberRoleService.assignRole('user-1', 'AUTHOR_RESEARCHER', 'actor-1');
      expect(roles).toEqual(['AUTHOR_RESEARCHER']);
    });

    it('is idempotent when assigning a role the member already holds', async () => {
      await memberRoleService.assignRole('user-1', 'AUTHOR_RESEARCHER', 'actor-1');
      const roles = await memberRoleService.assignRole('user-1', 'AUTHOR_RESEARCHER', 'actor-1');
      expect(roles).toEqual(['AUTHOR_RESEARCHER']);
    });

    it('records the actor as assignedBy', async () => {
      await memberRoleService.assignRole('user-1', 'AUTHOR_RESEARCHER', 'actor-1');
      const row = userRoleRepo.rows.find((r) => r.userId === 'user-1');
      expect(row?.assignedBy).toBe('actor-1');
    });

    it('rejects assigning a role that does not exist', async () => {
      await expect(memberRoleService.assignRole('user-1', 'NONEXISTENT', 'actor-1')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('revokeRole', () => {
    it('revokes a role from a member and returns their updated role list', async () => {
      await memberRoleService.assignRole('user-1', 'AUTHOR_RESEARCHER', 'actor-1');
      await memberRoleService.assignRole('user-1', 'DIGITAL_CONTENT_MANAGER', 'actor-1');

      const roles = await memberRoleService.revokeRole('user-1', 'AUTHOR_RESEARCHER');
      expect(roles).toEqual(['DIGITAL_CONTENT_MANAGER']);
    });

    it('rejects revoking a role that does not exist', async () => {
      await expect(memberRoleService.revokeRole('user-1', 'NONEXISTENT')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('is a no-op when revoking a role the member does not hold', async () => {
      await memberRoleService.assignRole('user-1', 'AUTHOR_RESEARCHER', 'actor-1');
      const roles = await memberRoleService.revokeRole('user-1', 'BOOK_EDITOR');
      expect(roles).toEqual(['AUTHOR_RESEARCHER']);
    });
  });
});

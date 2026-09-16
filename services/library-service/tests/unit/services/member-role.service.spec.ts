import { MemberRoleService, BASE_ROLE_NAME, TOP_ROLE_NAME } from '@application/services/member-role.service';
import { FakeRoleRepository, FakeUserRoleAssignmentRepository } from './fakes';

describe('MemberRoleService', () => {
  let roleRepo: FakeRoleRepository;
  let userRoleRepo: FakeUserRoleAssignmentRepository;
  let memberRoleService: MemberRoleService;

  beforeEach(() => {
    roleRepo = new FakeRoleRepository();
    roleRepo.seed(['LIBRARY_MANAGER', 'DIGITAL_LIBRARIAN', 'LIBRARIAN', 'CATALOGER', 'INVENTORY_MANAGER', 'MEMBER']);
    userRoleRepo = new FakeUserRoleAssignmentRepository(roleRepo);
    memberRoleService = new MemberRoleService(roleRepo, userRoleRepo);
  });

  describe('listRolesForUser', () => {
    it('returns an empty array for a member with no role assignments', async () => {
      const roles = await memberRoleService.listRolesForUser('user-1');
      expect(roles).toEqual([]);
    });

    it('lists every role assigned to a member', async () => {
      await memberRoleService.assignRole('user-1', BASE_ROLE_NAME, 'actor-1');
      await memberRoleService.assignRole('user-1', 'LIBRARIAN', 'actor-1');

      const roles = await memberRoleService.listRolesForUser('user-1');
      expect(roles.sort()).toEqual(['LIBRARIAN', 'MEMBER']);
    });
  });

  describe('assignRole', () => {
    it('assigns a role to a member and returns the updated role list', async () => {
      const roles = await memberRoleService.assignRole('user-1', 'CATALOGER', 'actor-1');
      expect(roles).toContain('CATALOGER');
    });

    it('is idempotent: assigning the same role twice does not duplicate it', async () => {
      await memberRoleService.assignRole('user-1', 'CATALOGER', 'actor-1');
      const roles = await memberRoleService.assignRole('user-1', 'CATALOGER', 'actor-1');
      expect(roles.filter((r) => r === 'CATALOGER')).toHaveLength(1);
    });

    it('records the actor as assignedBy', async () => {
      await memberRoleService.assignRole('user-1', 'CATALOGER', 'actor-42');
      const row = userRoleRepo.rows.find((r) => r.userId === 'user-1');
      expect(row?.assignedBy).toBe('actor-42');
    });

    it('rejects assigning a role that does not exist', async () => {
      await expect(memberRoleService.assignRole('user-1', 'NONEXISTENT', 'actor-1')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('revokeRole', () => {
    it('revokes a non-default role', async () => {
      await memberRoleService.assignRole('user-1', 'LIBRARIAN', 'actor-1');
      const roles = await memberRoleService.revokeRole('user-1', 'LIBRARIAN');
      expect(roles).not.toContain('LIBRARIAN');
    });

    it('rejects revoking the default MEMBER role', async () => {
      await memberRoleService.assignRole('user-1', BASE_ROLE_NAME, 'actor-1');
      await expect(memberRoleService.revokeRole('user-1', BASE_ROLE_NAME)).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects revoking a role that does not exist', async () => {
      await expect(memberRoleService.revokeRole('user-1', 'NONEXISTENT')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  it('exposes the module top role and base role constants', () => {
    expect(TOP_ROLE_NAME).toBe('LIBRARY_MANAGER');
    expect(BASE_ROLE_NAME).toBe('MEMBER');
  });
});

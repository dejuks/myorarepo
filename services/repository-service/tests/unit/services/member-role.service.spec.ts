import { MemberRoleService } from '@application/services/member-role.service';
import { FakeRoleRepository, FakeUserRoleAssignmentRepository } from './fakes';

describe('MemberRoleService', () => {
  let roleRepo: FakeRoleRepository;
  let userRoleRepo: FakeUserRoleAssignmentRepository;
  let memberRoleService: MemberRoleService;

  beforeEach(() => {
    roleRepo = new FakeRoleRepository();
    roleRepo.seed(['RESEARCHER_AUTHOR', 'REPOSITORY_CURATOR', 'CONTENT_REVIEWER', 'REPOSITORY_ADMINISTRATOR']);
    userRoleRepo = new FakeUserRoleAssignmentRepository(roleRepo);
    memberRoleService = new MemberRoleService(roleRepo, userRoleRepo);
  });

  describe('listRolesForUser', () => {
    it('returns an empty roles list for a member with no assignments', async () => {
      const result = await memberRoleService.listRolesForUser('user-1');
      expect(result).toEqual({ userId: 'user-1', roles: [] });
    });

    it('returns all roles assigned to a member', async () => {
      await memberRoleService.assignRole('user-1', 'RESEARCHER_AUTHOR', 'admin-id');
      await memberRoleService.assignRole('user-1', 'REPOSITORY_CURATOR', 'admin-id');

      const result = await memberRoleService.listRolesForUser('user-1');
      expect(result.roles).toEqual(expect.arrayContaining(['RESEARCHER_AUTHOR', 'REPOSITORY_CURATOR']));
      expect(result.roles).toHaveLength(2);
    });
  });

  describe('assignRole', () => {
    it('assigns a role to a member, recorded with the actor as assignedBy', async () => {
      const result = await memberRoleService.assignRole('user-2', 'CONTENT_REVIEWER', 'admin-id');
      expect(result.roles).toContain('CONTENT_REVIEWER');

      const row = userRoleRepo.rows.find((r) => r.userId === 'user-2' && r.assignedBy === 'admin-id');
      expect(row).toBeDefined();
    });

    it('is idempotent: assigning the same role twice does not duplicate it', async () => {
      await memberRoleService.assignRole('user-3', 'RESEARCHER_AUTHOR', 'admin-id');
      await memberRoleService.assignRole('user-3', 'RESEARCHER_AUTHOR', 'admin-id');

      const result = await memberRoleService.listRolesForUser('user-3');
      expect(result.roles.filter((r) => r === 'RESEARCHER_AUTHOR')).toHaveLength(1);
    });

    it('rejects assigning a role that does not exist', async () => {
      await expect(memberRoleService.assignRole('user-4', 'NONEXISTENT', 'admin-id')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('revokeRole', () => {
    it('revokes a previously assigned role', async () => {
      await memberRoleService.assignRole('user-5', 'REPOSITORY_CURATOR', 'admin-id');
      const result = await memberRoleService.revokeRole('user-5', 'REPOSITORY_CURATOR');
      expect(result.roles).not.toContain('REPOSITORY_CURATOR');
    });

    it('rejects revoking a role that does not exist', async () => {
      await expect(memberRoleService.revokeRole('user-6', 'NONEXISTENT')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('is a no-op (does not throw) when revoking a role the member never had', async () => {
      await expect(memberRoleService.revokeRole('user-7', 'CONTENT_REVIEWER')).resolves.toEqual({ userId: 'user-7', roles: [] });
    });
  });
});

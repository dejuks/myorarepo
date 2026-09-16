import { v4 as uuidv4 } from 'uuid';
import { MemberRoleService } from '@application/services/member-role.service';
import { FakeRoleRepository, FakeUserRoleAssignmentRepository } from './fakes';

describe('MemberRoleService', () => {
  let roleRepo: FakeRoleRepository;
  let userRoleRepo: FakeUserRoleAssignmentRepository;
  let memberRoleService: MemberRoleService;

  beforeEach(() => {
    roleRepo = new FakeRoleRepository();
    roleRepo.seed(['RESEARCHER_MEMBER', 'GROUP_MODERATOR', 'EVENT_CONTENT_MANAGER', 'PLATFORM_ADMINISTRATOR']);
    userRoleRepo = new FakeUserRoleAssignmentRepository(roleRepo);
    memberRoleService = new MemberRoleService(roleRepo, userRoleRepo);
  });

  it('lists no roles for a member with no assignments', async () => {
    const roles = await memberRoleService.listRolesForUser(uuidv4());
    expect(roles).toEqual([]);
  });

  it('assigns a role to a member and returns their updated role list', async () => {
    const userId = uuidv4();
    const actorId = uuidv4();

    const roles = await memberRoleService.assignRole(userId, 'GROUP_MODERATOR', actorId);
    expect(roles).toEqual(['GROUP_MODERATOR']);

    const stored = userRoleRepo.rows.find((r) => r.userId === userId);
    expect(stored?.assignedBy).toBe(actorId);
  });

  it('is idempotent: assigning the same role twice does not duplicate the assignment', async () => {
    const userId = uuidv4();
    await memberRoleService.assignRole(userId, 'GROUP_MODERATOR', uuidv4());
    await memberRoleService.assignRole(userId, 'GROUP_MODERATOR', uuidv4());

    expect(userRoleRepo.rows.filter((r) => r.userId === userId)).toHaveLength(1);
  });

  it('throws NotFoundError when assigning a role that does not exist', async () => {
    await expect(memberRoleService.assignRole(uuidv4(), 'NOT_A_ROLE', uuidv4())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('revokes a role from a member', async () => {
    const userId = uuidv4();
    await memberRoleService.assignRole(userId, 'RESEARCHER_MEMBER', uuidv4());
    await memberRoleService.assignRole(userId, 'GROUP_MODERATOR', uuidv4());

    const remaining = await memberRoleService.revokeRole(userId, 'GROUP_MODERATOR');
    expect(remaining).toEqual(['RESEARCHER_MEMBER']);
  });

  it('throws NotFoundError when revoking a role that does not exist', async () => {
    await expect(memberRoleService.revokeRole(uuidv4(), 'NOT_A_ROLE')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('revoking an unassigned (but existing) role is a no-op, not an error', async () => {
    const userId = uuidv4();
    const remaining = await memberRoleService.revokeRole(userId, 'RESEARCHER_MEMBER');
    expect(remaining).toEqual([]);
  });

  it('lists multiple roles for a member with multiple assignments', async () => {
    const userId = uuidv4();
    await memberRoleService.assignRole(userId, 'RESEARCHER_MEMBER', uuidv4());
    await memberRoleService.assignRole(userId, 'EVENT_CONTENT_MANAGER', uuidv4());

    const roles = await memberRoleService.listRolesForUser(userId);
    expect(roles.sort()).toEqual(['EVENT_CONTENT_MANAGER', 'RESEARCHER_MEMBER']);
  });
});

import { v4 as uuidv4 } from 'uuid';
import { MemberRoleService } from '@application/services/member-role.service';
import { FakeRoleRepository, FakeUserRoleAssignmentRepository } from './fakes';

describe('MemberRoleService', () => {
  let roleRepo: FakeRoleRepository;
  let userRoleRepo: FakeUserRoleAssignmentRepository;
  let memberRoleService: MemberRoleService;

  beforeEach(() => {
    roleRepo = new FakeRoleRepository();
    roleRepo.seed(['JOURNAL_MANAGER', 'EDITOR_IN_CHIEF', 'ASSOCIATE_EDITOR', 'REVIEWER', 'AUTHOR']);
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

    const roles = await memberRoleService.assignRole(userId, 'REVIEWER', actorId);

    expect(roles).toEqual(['REVIEWER']);
    const assignment = userRoleRepo.rows.find((r) => r.userId === userId);
    expect(assignment?.assignedBy).toBe(actorId);
  });

  it('is idempotent: assigning the same role twice does not duplicate it', async () => {
    const userId = uuidv4();
    const actorId = uuidv4();

    await memberRoleService.assignRole(userId, 'AUTHOR', actorId);
    const roles = await memberRoleService.assignRole(userId, 'AUTHOR', actorId);

    expect(roles).toEqual(['AUTHOR']);
    expect(userRoleRepo.rows.filter((r) => r.userId === userId)).toHaveLength(1);
  });

  it('rejects assigning a role that does not exist', async () => {
    await expect(memberRoleService.assignRole(uuidv4(), 'NOT_A_ROLE', uuidv4())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('revokes a role from a member and returns their updated role list', async () => {
    const userId = uuidv4();
    await memberRoleService.assignRole(userId, 'REVIEWER', uuidv4());
    await memberRoleService.assignRole(userId, 'ASSOCIATE_EDITOR', uuidv4());

    const roles = await memberRoleService.revokeRole(userId, 'REVIEWER');

    expect(roles).toEqual(['ASSOCIATE_EDITOR']);
  });

  it('rejects revoking a role that does not exist', async () => {
    await expect(memberRoleService.revokeRole(uuidv4(), 'NOT_A_ROLE')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('revoking an unassigned role is a no-op (no error)', async () => {
    const userId = uuidv4();
    const roles = await memberRoleService.revokeRole(userId, 'AUTHOR');
    expect(roles).toEqual([]);
  });
});

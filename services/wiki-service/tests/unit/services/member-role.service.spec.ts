import { v4 as uuidv4 } from 'uuid';
import { MemberRoleService } from '@application/services/member-role.service';
import { FakeRoleRepository, FakeUserRoleAssignmentRepository } from './fakes';

describe('MemberRoleService', () => {
  let roleRepo: FakeRoleRepository;
  let userRoleRepo: FakeUserRoleAssignmentRepository;
  let memberRoleService: MemberRoleService;

  beforeEach(() => {
    roleRepo = new FakeRoleRepository();
    roleRepo.seed(['REGISTERED_EDITOR', 'ADMINISTRATOR', 'BUREAUCRAT', 'OVERSIGHTER']);
    userRoleRepo = new FakeUserRoleAssignmentRepository(roleRepo);
    memberRoleService = new MemberRoleService(roleRepo, userRoleRepo);
  });

  it('lists no roles for a member with no assignments', async () => {
    const roles = await memberRoleService.listRolesForUser(uuidv4());
    expect(roles).toEqual([]);
  });

  it('assigns a role to a member and returns their updated role list', async () => {
    const userId = uuidv4();
    const actorUserId = uuidv4();

    const result = await memberRoleService.assignRole(userId, 'registered_editor', actorUserId);

    expect(result).toEqual(['REGISTERED_EDITOR']);
    expect(await memberRoleService.listRolesForUser(userId)).toEqual(['REGISTERED_EDITOR']);
  });

  it('records who assigned the role', async () => {
    const userId = uuidv4();
    const actorUserId = uuidv4();
    const role = await roleRepo.findByName('BUREAUCRAT');

    await memberRoleService.assignRole(userId, 'BUREAUCRAT', actorUserId);

    const row = userRoleRepo.rows.find((r) => r.userId === userId && r.roleId === role!.id);
    expect(row?.assignedBy).toBe(actorUserId);
  });

  it('is idempotent: assigning the same role twice does not duplicate it', async () => {
    const userId = uuidv4();
    const actorUserId = uuidv4();

    await memberRoleService.assignRole(userId, 'ADMINISTRATOR', actorUserId);
    const result = await memberRoleService.assignRole(userId, 'ADMINISTRATOR', actorUserId);

    expect(result).toEqual(['ADMINISTRATOR']);
  });

  it('throws NotFoundError assigning a role that does not exist', async () => {
    await expect(memberRoleService.assignRole(uuidv4(), 'NOT_A_ROLE', uuidv4())).rejects.toMatchObject({ statusCode: 404 });
  });

  it('revokes a role from a member', async () => {
    const userId = uuidv4();
    await memberRoleService.assignRole(userId, 'OVERSIGHTER', uuidv4());
    await memberRoleService.assignRole(userId, 'ADMINISTRATOR', uuidv4());

    const result = await memberRoleService.revokeRole(userId, 'OVERSIGHTER');

    expect(result).toEqual(['ADMINISTRATOR']);
    expect(await memberRoleService.listRolesForUser(userId)).toEqual(['ADMINISTRATOR']);
  });

  it('throws NotFoundError revoking a role that does not exist', async () => {
    await expect(memberRoleService.revokeRole(uuidv4(), 'NOT_A_ROLE')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('is a no-op revoking a role the member never had', async () => {
    const userId = uuidv4();
    const result = await memberRoleService.revokeRole(userId, 'BUREAUCRAT');
    expect(result).toEqual([]);
  });
});

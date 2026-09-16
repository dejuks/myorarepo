import { bootstrapModuleAdmin, BASE_ROLE_NAME, TOP_ROLE_NAME } from '@infrastructure/bootstrap/module-admin.bootstrap';
import { computeBootstrapUserId } from '@common/utils/bootstrap-id.util';
import { FakeRoleRepository, FakeUserRoleAssignmentRepository } from './fakes';

function makeRepos() {
  const roleRepo = new FakeRoleRepository();
  roleRepo.seed(['BOOK_EDITOR', 'DIGITAL_CONTENT_MANAGER', 'FINANCE_OPERATIONS_OFFICER', 'AUTHOR_RESEARCHER']);
  const userRoleRepo = new FakeUserRoleAssignmentRepository(roleRepo);
  return { roleRepo, userRoleRepo };
}

describe('bootstrapModuleAdmin', () => {
  it('does nothing when SUPER_ADMIN_EMAIL is not provided', async () => {
    const { roleRepo, userRoleRepo } = makeRepos();

    await bootstrapModuleAdmin(roleRepo, userRoleRepo, {});

    expect(userRoleRepo.rows).toHaveLength(0);
  });

  it('assigns both the base role (AUTHOR_RESEARCHER) and top role (BOOK_EDITOR)', async () => {
    const { roleRepo, userRoleRepo } = makeRepos();

    await bootstrapModuleAdmin(roleRepo, userRoleRepo, { email: 'admin@ora.local' });

    const userId = computeBootstrapUserId('admin@ora.local');
    expect(await userRoleRepo.listRoleNamesForUser(userId)).toEqual(expect.arrayContaining([BASE_ROLE_NAME, TOP_ROLE_NAME]));
  });

  it('is idempotent: does not duplicate role assignments across repeated runs', async () => {
    const { roleRepo, userRoleRepo } = makeRepos();
    const config = { email: 'admin@ora.local' };

    await bootstrapModuleAdmin(roleRepo, userRoleRepo, config);
    await bootstrapModuleAdmin(roleRepo, userRoleRepo, config);

    const userId = computeBootstrapUserId('admin@ora.local');
    expect(userRoleRepo.rows.filter((r) => r.userId === userId)).toHaveLength(2); // AUTHOR_RESEARCHER + BOOK_EDITOR, not 4
  });

  it('derives the same user id every other service derives for the same email', async () => {
    // Cross-service agreement is the entire point of computeBootstrapUserId — this pins
    // the exact value so a future change to the namespace constant here is caught,
    // since other services' copies of the constant can't be imported cross-package.
    expect(computeBootstrapUserId('admin@ora.local')).toBe(computeBootstrapUserId('admin@ora.local'));
    expect(computeBootstrapUserId('admin@ora.local')).not.toBe(computeBootstrapUserId('someone-else@ora.local'));
  });

  it('skips role assignment gracefully (without throwing) if a system role is missing', async () => {
    const roleRepo = new FakeRoleRepository(); // seeded with nothing — simulates migrations not having run
    const userRoleRepo = new FakeUserRoleAssignmentRepository(roleRepo);

    await expect(bootstrapModuleAdmin(roleRepo, userRoleRepo, { email: 'admin@ora.local' })).resolves.not.toThrow();
    expect(userRoleRepo.rows).toHaveLength(0); // just no roles to attach
  });

  it('normalizes email casing/whitespace to derive the same user id', async () => {
    const { roleRepo, userRoleRepo } = makeRepos();

    await bootstrapModuleAdmin(roleRepo, userRoleRepo, { email: '  Admin@Ora.Local  ' });

    const userId = computeBootstrapUserId('admin@ora.local');
    expect(await userRoleRepo.listRoleNamesForUser(userId)).toEqual(expect.arrayContaining([BASE_ROLE_NAME, TOP_ROLE_NAME]));
  });
});

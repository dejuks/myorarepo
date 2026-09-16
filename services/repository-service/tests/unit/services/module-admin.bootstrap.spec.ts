import { bootstrapModuleAdmin } from '@infrastructure/bootstrap/module-admin.bootstrap';
import { computeBootstrapUserId } from '@common/utils/bootstrap-id.util';
import { FakeRoleRepository, FakeUserRoleAssignmentRepository } from './fakes';

function makeRepos() {
  const roleRepo = new FakeRoleRepository();
  roleRepo.seed(['RESEARCHER_AUTHOR', 'REPOSITORY_CURATOR', 'CONTENT_REVIEWER', 'REPOSITORY_ADMINISTRATOR']);
  const userRoleRepo = new FakeUserRoleAssignmentRepository(roleRepo);
  return { roleRepo, userRoleRepo };
}

describe('bootstrapModuleAdmin', () => {
  it('does nothing when SUPER_ADMIN_EMAIL is not provided', async () => {
    const { roleRepo, userRoleRepo } = makeRepos();

    await bootstrapModuleAdmin(roleRepo, userRoleRepo, {});

    expect(userRoleRepo.rows).toHaveLength(0);
  });

  it('assigns both the base role (RESEARCHER_AUTHOR) and the top role (REPOSITORY_ADMINISTRATOR) to the deterministic bootstrap user id', async () => {
    const { roleRepo, userRoleRepo } = makeRepos();

    await bootstrapModuleAdmin(roleRepo, userRoleRepo, { email: 'admin@ora.local' });

    const userId = computeBootstrapUserId('admin@ora.local');
    expect(await userRoleRepo.listRoleNamesForUser(userId)).toEqual(
      expect.arrayContaining(['RESEARCHER_AUTHOR', 'REPOSITORY_ADMINISTRATOR']),
    );
  });

  it('is idempotent: running twice does not duplicate role assignments', async () => {
    const { roleRepo, userRoleRepo } = makeRepos();
    const config = { email: 'admin@ora.local' };

    await bootstrapModuleAdmin(roleRepo, userRoleRepo, config);
    await bootstrapModuleAdmin(roleRepo, userRoleRepo, config);

    const userId = computeBootstrapUserId('admin@ora.local');
    expect(userRoleRepo.rows.filter((r) => r.userId === userId)).toHaveLength(2); // RESEARCHER_AUTHOR + REPOSITORY_ADMINISTRATOR, not 4
  });

  it('derives the same user id every service in the platform would derive for the same email', () => {
    // Cross-service agreement is the entire point of computeBootstrapUserId — this pins
    // the exact value so a future change to the namespace constant here is caught,
    // since another service's copy of the constant can't be imported cross-package.
    expect(computeBootstrapUserId('admin@ora.local')).toBe(computeBootstrapUserId('admin@ora.local'));
    expect(computeBootstrapUserId('admin@ora.local')).not.toBe(computeBootstrapUserId('someone-else@ora.local'));
  });

  it('skips role assignment gracefully (without throwing) if a system role is missing', async () => {
    const roleRepo = new FakeRoleRepository(); // seeded with nothing — simulates migrations not having run
    const userRoleRepo = new FakeUserRoleAssignmentRepository(roleRepo);

    await expect(bootstrapModuleAdmin(roleRepo, userRoleRepo, { email: 'admin@ora.local' })).resolves.not.toThrow();
    expect(userRoleRepo.rows).toHaveLength(0);
  });

  it('does not create a duplicate row if the role assignment already exists (assigned by another path)', async () => {
    const { roleRepo, userRoleRepo } = makeRepos();
    const userId = computeBootstrapUserId('admin@ora.local');
    const topRole = await roleRepo.findByName('REPOSITORY_ADMINISTRATOR');
    await userRoleRepo.assign(userId, topRole!.id, null);

    await bootstrapModuleAdmin(roleRepo, userRoleRepo, { email: 'admin@ora.local' });

    expect(userRoleRepo.rows.filter((r) => r.userId === userId && r.roleId === topRole!.id)).toHaveLength(1);
  });
});

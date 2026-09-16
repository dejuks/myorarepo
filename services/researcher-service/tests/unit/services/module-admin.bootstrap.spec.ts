import { bootstrapModuleAdmin } from '@infrastructure/bootstrap/module-admin.bootstrap';
import { computeBootstrapUserId } from '@common/utils/bootstrap-id.util';
import { FakeRoleRepository, FakeUserRoleAssignmentRepository } from './fakes';

function makeRepos() {
  const roleRepo = new FakeRoleRepository();
  roleRepo.seed(['RESEARCHER_MEMBER', 'GROUP_MODERATOR', 'EVENT_CONTENT_MANAGER', 'PLATFORM_ADMINISTRATOR']);
  const userRoleRepo = new FakeUserRoleAssignmentRepository(roleRepo);
  return { roleRepo, userRoleRepo };
}

describe('bootstrapModuleAdmin', () => {
  it('does nothing when SUPER_ADMIN_EMAIL is not provided', async () => {
    const { roleRepo, userRoleRepo } = makeRepos();

    await bootstrapModuleAdmin(roleRepo, userRoleRepo, {});

    expect(userRoleRepo.rows).toHaveLength(0);
  });

  it('assigns both the base role (RESEARCHER_MEMBER) and the top role (PLATFORM_ADMINISTRATOR)', async () => {
    const { roleRepo, userRoleRepo } = makeRepos();

    await bootstrapModuleAdmin(roleRepo, userRoleRepo, { email: 'admin@ora.local' });

    const userId = computeBootstrapUserId('admin@ora.local');
    expect(await userRoleRepo.listRoleNamesForUser(userId)).toEqual(expect.arrayContaining(['RESEARCHER_MEMBER', 'PLATFORM_ADMINISTRATOR']));
  });

  it('is idempotent: does not duplicate role assignments across repeated calls', async () => {
    const { roleRepo, userRoleRepo } = makeRepos();
    const config = { email: 'admin@ora.local' };

    await bootstrapModuleAdmin(roleRepo, userRoleRepo, config);
    await bootstrapModuleAdmin(roleRepo, userRoleRepo, config);

    const userId = computeBootstrapUserId('admin@ora.local');
    expect(userRoleRepo.rows.filter((r) => r.userId === userId)).toHaveLength(2); // RESEARCHER_MEMBER + PLATFORM_ADMINISTRATOR, not 4
  });

  it('derives the same user id every other service would derive for the same email', () => {
    expect(computeBootstrapUserId('admin@ora.local')).toBe(computeBootstrapUserId('admin@ora.local'));
    expect(computeBootstrapUserId('admin@ora.local')).not.toBe(computeBootstrapUserId('someone-else@ora.local'));
  });

  it('skips role assignment gracefully (without throwing) if a system role is missing', async () => {
    const roleRepo = new FakeRoleRepository(); // seeded with nothing — simulates migrations not having run
    const userRoleRepo = new FakeUserRoleAssignmentRepository(roleRepo);

    await expect(bootstrapModuleAdmin(roleRepo, userRoleRepo, { email: 'admin@ora.local' })).resolves.not.toThrow();
    expect(userRoleRepo.rows).toHaveLength(0);
  });

  it('normalizes email casing/whitespace before deriving the bootstrap user id', async () => {
    const { roleRepo, userRoleRepo } = makeRepos();

    await bootstrapModuleAdmin(roleRepo, userRoleRepo, { email: '  Admin@ORA.local  ' });

    const userId = computeBootstrapUserId('admin@ora.local');
    expect(await userRoleRepo.listRoleNamesForUser(userId)).toEqual(expect.arrayContaining(['RESEARCHER_MEMBER', 'PLATFORM_ADMINISTRATOR']));
  });
});

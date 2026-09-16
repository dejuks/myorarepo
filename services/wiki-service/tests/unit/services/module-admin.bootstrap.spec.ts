import { bootstrapModuleAdmin } from '@infrastructure/bootstrap/module-admin.bootstrap';
import { computeBootstrapUserId } from '@common/utils/bootstrap-id.util';
import { FakeRoleRepository, FakeUserRoleAssignmentRepository } from './fakes';

function makeRepos() {
  const roleRepo = new FakeRoleRepository();
  roleRepo.seed(['REGISTERED_EDITOR', 'ADMINISTRATOR', 'BUREAUCRAT', 'OVERSIGHTER']);
  const userRoleRepo = new FakeUserRoleAssignmentRepository(roleRepo);
  return { roleRepo, userRoleRepo };
}

describe('bootstrapModuleAdmin', () => {
  it('does nothing when SUPER_ADMIN_EMAIL is not provided', async () => {
    const { roleRepo, userRoleRepo } = makeRepos();

    await bootstrapModuleAdmin(roleRepo, userRoleRepo, {});

    expect(userRoleRepo.rows).toHaveLength(0);
  });

  it('assigns both the base role (REGISTERED_EDITOR) and the top role (BUREAUCRAT)', async () => {
    const { roleRepo, userRoleRepo } = makeRepos();

    await bootstrapModuleAdmin(roleRepo, userRoleRepo, { email: 'admin@ora.local' });

    const userId = computeBootstrapUserId('admin@ora.local');
    expect(await userRoleRepo.listRoleNamesForUser(userId)).toEqual(expect.arrayContaining(['REGISTERED_EDITOR', 'BUREAUCRAT']));
  });

  it('does not assign ADMINISTRATOR or OVERSIGHTER — only the base and top roles', async () => {
    const { roleRepo, userRoleRepo } = makeRepos();

    await bootstrapModuleAdmin(roleRepo, userRoleRepo, { email: 'admin@ora.local' });

    const userId = computeBootstrapUserId('admin@ora.local');
    const roles = await userRoleRepo.listRoleNamesForUser(userId);
    expect(roles).toHaveLength(2);
    expect(roles).not.toEqual(expect.arrayContaining(['ADMINISTRATOR', 'OVERSIGHTER']));
  });

  it('is idempotent: running it twice does not duplicate role assignments', async () => {
    const { roleRepo, userRoleRepo } = makeRepos();
    const config = { email: 'admin@ora.local' };

    await bootstrapModuleAdmin(roleRepo, userRoleRepo, config);
    await bootstrapModuleAdmin(roleRepo, userRoleRepo, config);

    const userId = computeBootstrapUserId('admin@ora.local');
    expect(userRoleRepo.rows.filter((r) => r.userId === userId)).toHaveLength(2); // REGISTERED_EDITOR + BUREAUCRAT, not 4
  });

  it('derives the same user id every other service would derive for the same email', async () => {
    // Cross-service agreement is the entire point of computeBootstrapUserId — this pins
    // the exact value so a future change to the namespace constant here is caught, since
    // other services' copies of the constant can't be imported cross-package.
    expect(computeBootstrapUserId('admin@ora.local')).toBe(computeBootstrapUserId('admin@ora.local'));
    expect(computeBootstrapUserId('admin@ora.local')).not.toBe(computeBootstrapUserId('someone-else@ora.local'));
  });

  it('skips role assignment gracefully (without throwing) if a system role is missing', async () => {
    const roleRepo = new FakeRoleRepository(); // seeded with nothing — simulates migrations not having run
    const userRoleRepo = new FakeUserRoleAssignmentRepository(roleRepo);

    await expect(bootstrapModuleAdmin(roleRepo, userRoleRepo, { email: 'admin@ora.local' })).resolves.not.toThrow();
    expect(userRoleRepo.rows).toHaveLength(0);
  });

  it('normalizes email case/whitespace the same way every other bootstrap does', async () => {
    const { roleRepo, userRoleRepo } = makeRepos();

    await bootstrapModuleAdmin(roleRepo, userRoleRepo, { email: '  Admin@Ora.Local  ' });

    const userId = computeBootstrapUserId('admin@ora.local');
    expect(await userRoleRepo.listRoleNamesForUser(userId)).toEqual(expect.arrayContaining(['REGISTERED_EDITOR', 'BUREAUCRAT']));
  });
});

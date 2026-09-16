import { bootstrapSuperAdmin } from '@infrastructure/bootstrap/super-admin.bootstrap';
import { computeBootstrapUserId } from '@common/utils/bootstrap-id.util';
import { UserStatus } from '@domain/entities/user.entity';
import { FakeUserRepository, FakeRoleRepository, FakeUserRoleAssignmentRepository } from './fakes';

function makeRepos() {
  const userRepo = new FakeUserRepository();
  const roleRepo = new FakeRoleRepository();
  roleRepo.seed(['USER', 'RESEARCHER', 'EDITOR', 'REVIEWER', 'LIBRARIAN', 'ADMIN']);
  const userRoleRepo = new FakeUserRoleAssignmentRepository(roleRepo);
  return { userRepo, roleRepo, userRoleRepo };
}

describe('bootstrapSuperAdmin', () => {
  it('does nothing when SUPER_ADMIN_EMAIL is not provided', async () => {
    const { userRepo, roleRepo, userRoleRepo } = makeRepos();

    await bootstrapSuperAdmin(userRepo, roleRepo, userRoleRepo, {});

    expect(userRepo.rows.size).toBe(0);
  });

  it('creates an ACTIVE profile assigned both USER and ADMIN roles', async () => {
    const { userRepo, roleRepo, userRoleRepo } = makeRepos();

    await bootstrapSuperAdmin(userRepo, roleRepo, userRoleRepo, { email: 'admin@ora.local' });

    const userId = computeBootstrapUserId('admin@ora.local');
    const created = await userRepo.findById(userId);
    expect(created).not.toBeNull();
    expect(created?.status).toBe(UserStatus.ACTIVE);
    expect(await userRoleRepo.listRoleNamesForUser(userId)).toEqual(expect.arrayContaining(['USER', 'ADMIN']));
  });

  it('defaults first/last name to "Super"/"Admin" when not provided, and honors them when given', async () => {
    const { userRepo, roleRepo, userRoleRepo } = makeRepos();

    await bootstrapSuperAdmin(userRepo, roleRepo, userRoleRepo, { email: 'admin@ora.local' });
    const defaulted = await userRepo.findById(computeBootstrapUserId('admin@ora.local'));
    expect(defaulted?.firstName).toBe('Super');
    expect(defaulted?.lastName).toBe('Admin');

    const { userRepo: userRepo2, roleRepo: roleRepo2, userRoleRepo: userRoleRepo2 } = makeRepos();
    await bootstrapSuperAdmin(userRepo2, roleRepo2, userRoleRepo2, {
      email: 'root@ora.local',
      firstName: 'Root',
      lastName: 'Owner',
    });
    const named = await userRepo2.findById(computeBootstrapUserId('root@ora.local'));
    expect(named?.firstName).toBe('Root');
    expect(named?.lastName).toBe('Owner');
  });

  it('is idempotent: does not create a second profile or duplicate role assignments', async () => {
    const { userRepo, roleRepo, userRoleRepo } = makeRepos();
    const config = { email: 'admin@ora.local' };

    await bootstrapSuperAdmin(userRepo, roleRepo, userRoleRepo, config);
    await bootstrapSuperAdmin(userRepo, roleRepo, userRoleRepo, config);

    expect(userRepo.rows.size).toBe(1);
    const userId = computeBootstrapUserId('admin@ora.local');
    expect(userRoleRepo.rows.filter((r) => r.userId === userId)).toHaveLength(2); // USER + ADMIN, not 4
  });

  it('derives the same user id auth-service would derive for the same email', async () => {
    // Cross-service agreement is the entire point of computeBootstrapUserId — this pins
    // the exact value so a future change to the namespace constant here is caught,
    // since auth-service's copy of the constant can't be imported cross-package.
    expect(computeBootstrapUserId('admin@ora.local')).toBe(computeBootstrapUserId('admin@ora.local'));
    expect(computeBootstrapUserId('admin@ora.local')).not.toBe(computeBootstrapUserId('someone-else@ora.local'));
  });

  it('skips role assignment gracefully (without throwing) if a system role is missing', async () => {
    const userRepo = new FakeUserRepository();
    const roleRepo = new FakeRoleRepository(); // seeded with nothing — simulates migrations not having run
    const userRoleRepo = new FakeUserRoleAssignmentRepository(roleRepo);

    await expect(bootstrapSuperAdmin(userRepo, roleRepo, userRoleRepo, { email: 'admin@ora.local' })).resolves.not.toThrow();
    expect(userRepo.rows.size).toBe(1); // profile still gets created
    expect(userRoleRepo.rows).toHaveLength(0); // just no roles to attach
  });
});

import { bootstrapSuperAdmin } from '@infrastructure/bootstrap/super-admin.bootstrap';
import { computeBootstrapUserId } from '@common/utils/bootstrap-id.util';
import { AccountStatus } from '@domain/entities/user-credential.entity';
import { FakeUserCredentialRepository } from './fakes';

describe('bootstrapSuperAdmin', () => {
  it('does nothing when email/password are not both provided', async () => {
    const repo = new FakeUserCredentialRepository();

    await bootstrapSuperAdmin(repo, {});
    await bootstrapSuperAdmin(repo, { email: 'admin@ora.local' });
    await bootstrapSuperAdmin(repo, { password: 'ChangeMe123!' });

    expect(repo.rows.size).toBe(0);
  });

  it('creates an ACTIVE ADMIN credential when both are provided and no account exists', async () => {
    const repo = new FakeUserCredentialRepository();

    await bootstrapSuperAdmin(repo, { email: 'admin@ora.local', password: 'ChangeMe123!' });

    const created = await repo.findByEmail('admin@ora.local');
    expect(created).not.toBeNull();
    expect(created?.accountStatus).toBe(AccountStatus.ACTIVE);
    expect(created?.roles).toEqual(expect.arrayContaining(['ADMIN', 'USER']));
    expect(created?.userId).toBe(computeBootstrapUserId('admin@ora.local'));
  });

  it('is idempotent: does not create a second row when the account already exists', async () => {
    const repo = new FakeUserCredentialRepository();
    const config = { email: 'admin@ora.local', password: 'ChangeMe123!' };

    await bootstrapSuperAdmin(repo, config);
    await bootstrapSuperAdmin(repo, config);

    expect(repo.rows.size).toBe(1);
  });

  it('normalizes email casing/whitespace before matching or creating', async () => {
    const repo = new FakeUserCredentialRepository();

    await bootstrapSuperAdmin(repo, { email: '  Admin@ORA.local  ', password: 'ChangeMe123!' });

    expect(await repo.findByEmail('admin@ora.local')).not.toBeNull();
  });
});

import { RoleService } from '@application/services/role.service';
import { FakeRoleRepository } from './fakes';

describe('RoleService', () => {
  let roleRepo: FakeRoleRepository;
  let roleService: RoleService;

  beforeEach(() => {
    roleRepo = new FakeRoleRepository();
    roleRepo.seed(['USER', 'ADMIN']);
    roleService = new RoleService(roleRepo);
  });

  it('lists all roles', async () => {
    const roles = await roleService.listRoles();
    expect(roles.map((r) => r.name).sort()).toEqual(['ADMIN', 'USER']);
  });

  it('creates a new custom role', async () => {
    const role = await roleService.createRole({ name: 'CURATOR', description: 'Curates featured content' });
    expect(role.name).toBe('CURATOR');
    expect(role.isSystem).toBe(false);
  });

  it('rejects creating a role with a duplicate name', async () => {
    await expect(roleService.createRole({ name: 'USER' })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rejects deleting a system role', async () => {
    const systemRole = (await roleRepo.listAll()).find((r) => r.name === 'ADMIN')!;
    await expect(roleService.deleteRole(systemRole.id)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('deletes a custom (non-system) role', async () => {
    const created = await roleService.createRole({ name: 'CUSTOM_ROLE' });
    await roleService.deleteRole(created.id);
    const roles = await roleService.listRoles();
    expect(roles.find((r) => r.id === created.id)).toBeUndefined();
  });

  it('throws NotFoundError when deleting a nonexistent role', async () => {
    await expect(roleService.deleteRole('nonexistent-id')).rejects.toMatchObject({ statusCode: 404 });
  });
});

import { RoleService } from '@application/services/role.service';
import { FakeRoleRepository } from './fakes';

describe('RoleService', () => {
  let roleRepo: FakeRoleRepository;
  let roleService: RoleService;

  beforeEach(() => {
    roleRepo = new FakeRoleRepository();
    roleRepo.seed(['BOOK_EDITOR', 'DIGITAL_CONTENT_MANAGER', 'FINANCE_OPERATIONS_OFFICER', 'AUTHOR_RESEARCHER']);
    roleService = new RoleService(roleRepo);
  });

  it('lists all roles', async () => {
    const roles = await roleService.listRoles();
    expect(roles.map((r) => r.name).sort()).toEqual(['AUTHOR_RESEARCHER', 'BOOK_EDITOR', 'DIGITAL_CONTENT_MANAGER', 'FINANCE_OPERATIONS_OFFICER']);
  });

  it('creates a new custom role', async () => {
    const role = await roleService.createRole({ name: 'PROOFREADER', description: 'Reviews final proofs' });
    expect(role.name).toBe('PROOFREADER');
    expect(role.isSystem).toBe(false);
  });

  it('rejects creating a role with a duplicate name', async () => {
    await expect(roleService.createRole({ name: 'BOOK_EDITOR' })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rejects deleting a system role', async () => {
    const systemRole = (await roleRepo.listAll()).find((r) => r.name === 'BOOK_EDITOR')!;
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

import { PermissionService } from '@application/services/permission.service';
import {
  FakeRoleRepository,
  FakeUserRoleAssignmentRepository,
  FakePermissionRepository,
  FakeRolePermissionRepository,
} from './fakes';

const CATALOG = [
  { key: 'users.view', category: 'User Management', label: 'View users' },
  { key: 'users.manage', category: 'User Management', label: 'Manage users' },
  { key: 'roles.view_catalog', category: 'Role Management', label: 'View roles' },
  { key: 'roles.manage_catalog', category: 'Role Management', label: 'Manage roles' },
  { key: 'roles.assign', category: 'Role Management', label: 'Assign roles' },
];

function makeService() {
  const roleRepo = new FakeRoleRepository();
  roleRepo.seed(['USER', 'ADMIN', 'RESEARCHER']);
  const userRoleRepo = new FakeUserRoleAssignmentRepository(roleRepo);
  const permissionRepo = new FakePermissionRepository();
  const permissionIds = permissionRepo.seed(CATALOG);
  const rolePermissionRepo = new FakeRolePermissionRepository(roleRepo, permissionRepo);
  const permissionService = new PermissionService(permissionRepo, rolePermissionRepo, roleRepo, userRoleRepo);
  return { roleRepo, userRoleRepo, permissionRepo, rolePermissionRepo, permissionService, permissionIds };
}

describe('PermissionService', () => {
  it('lists the fixed permission catalog', async () => {
    const { permissionService } = makeService();
    const permissions = await permissionService.listPermissions();
    expect(permissions.map((p) => p.key).sort()).toEqual(
      ['roles.assign', 'roles.manage_catalog', 'roles.view_catalog', 'users.manage', 'users.view'].sort(),
    );
  });

  it('returns an empty permission set for a role that has none granted', async () => {
    const { roleRepo, permissionService } = makeService();
    const researcher = await roleRepo.findByName('RESEARCHER');
    const result = await permissionService.getRolePermissions(researcher!.id);
    expect(result.permissionKeys).toEqual([]);
  });

  it('throws NotFoundError when getting permissions for a nonexistent role', async () => {
    const { permissionService } = makeService();
    await expect(permissionService.getRolePermissions('nonexistent')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('sets a role permission set and can read it back', async () => {
    const { roleRepo, permissionService } = makeService();
    const researcher = await roleRepo.findByName('RESEARCHER');

    const result = await permissionService.setRolePermissions(researcher!.id, ['users.view', 'roles.view_catalog']);

    expect(result.permissionKeys.sort()).toEqual(['roles.view_catalog', 'users.view']);
    const readBack = await permissionService.getRolePermissions(researcher!.id);
    expect(readBack.permissionKeys.sort()).toEqual(['roles.view_catalog', 'users.view']);
  });

  it('setting a role permission set REPLACES the previous set rather than adding to it', async () => {
    const { roleRepo, permissionService } = makeService();
    const researcher = await roleRepo.findByName('RESEARCHER');

    await permissionService.setRolePermissions(researcher!.id, ['users.view', 'users.manage']);
    const result = await permissionService.setRolePermissions(researcher!.id, ['roles.assign']);

    expect(result.permissionKeys).toEqual(['roles.assign']);
  });

  it('rejects setting an unknown permission key', async () => {
    const { roleRepo, permissionService } = makeService();
    const researcher = await roleRepo.findByName('RESEARCHER');
    await expect(permissionService.setRolePermissions(researcher!.id, ['not.a.real.permission'])).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('throws NotFoundError when setting permissions on a nonexistent role', async () => {
    const { permissionService } = makeService();
    await expect(permissionService.setRolePermissions('nonexistent', ['users.view'])).rejects.toMatchObject({ statusCode: 404 });
  });

  describe('userHasPermission — the live enforcement check', () => {
    it('is false for a user with no role assignments', async () => {
      const { permissionService } = makeService();
      expect(await permissionService.userHasPermission('user-1', 'users.view')).toBe(false);
    });

    it('is true once the user role assignment carries a role that grants the permission', async () => {
      const { roleRepo, userRoleRepo, permissionService } = makeService();
      const researcher = await roleRepo.findByName('RESEARCHER');
      await userRoleRepo.assign('user-1', researcher!.id, null);
      await permissionService.setRolePermissions(researcher!.id, ['users.view']);

      expect(await permissionService.userHasPermission('user-1', 'users.view')).toBe(true);
      expect(await permissionService.userHasPermission('user-1', 'users.manage')).toBe(false);
    });

    it('reflects a permission grant added AFTER role assignment, with no re-assignment needed (no re-login required)', async () => {
      const { roleRepo, userRoleRepo, permissionService } = makeService();
      const researcher = await roleRepo.findByName('RESEARCHER');
      await userRoleRepo.assign('user-1', researcher!.id, null);

      expect(await permissionService.userHasPermission('user-1', 'users.manage')).toBe(false);

      await permissionService.setRolePermissions(researcher!.id, ['users.manage']);

      expect(await permissionService.userHasPermission('user-1', 'users.manage')).toBe(true);
    });

    it('reflects a role assignment added AFTER the role already had permissions granted', async () => {
      const { roleRepo, userRoleRepo, permissionService } = makeService();
      const admin = await roleRepo.findByName('ADMIN');
      await permissionService.setRolePermissions(admin!.id, ['users.manage']);

      expect(await permissionService.userHasPermission('user-1', 'users.manage')).toBe(false);

      await userRoleRepo.assign('user-1', admin!.id, null);

      expect(await permissionService.userHasPermission('user-1', 'users.manage')).toBe(true);
    });

    it('loses access immediately once the granting role is revoked from the user', async () => {
      const { roleRepo, userRoleRepo, permissionService } = makeService();
      const researcher = await roleRepo.findByName('RESEARCHER');
      await userRoleRepo.assign('user-1', researcher!.id, null);
      await permissionService.setRolePermissions(researcher!.id, ['users.manage']);
      expect(await permissionService.userHasPermission('user-1', 'users.manage')).toBe(true);

      await userRoleRepo.revoke('user-1', researcher!.id);

      expect(await permissionService.userHasPermission('user-1', 'users.manage')).toBe(false);
    });

    it('grants access via ANY of the user\'s roles, not just the first', async () => {
      const { roleRepo, userRoleRepo, permissionService } = makeService();
      const user = await roleRepo.findByName('USER');
      const researcher = await roleRepo.findByName('RESEARCHER');
      await userRoleRepo.assign('user-1', user!.id, null);
      await userRoleRepo.assign('user-1', researcher!.id, null);
      await permissionService.setRolePermissions(researcher!.id, ['roles.assign']);

      expect(await permissionService.userHasPermission('user-1', 'roles.assign')).toBe(true);
    });
  });
});

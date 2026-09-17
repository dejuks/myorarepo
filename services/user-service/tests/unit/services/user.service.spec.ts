import { UserService } from '@application/services/user.service';
import { Gender, UserStatus } from '@domain/entities/user.entity';
import { FakeUserRepository, FakeRoleRepository, FakeUserRoleAssignmentRepository } from './fakes';

jest.mock('@infrastructure/messaging/rabbitmq.publisher', () => ({
  rabbitMqPublisher: { publish: jest.fn().mockResolvedValue(undefined) },
}));

describe('UserService', () => {
  let userRepo: FakeUserRepository;
  let roleRepo: FakeRoleRepository;
  let userRoleRepo: FakeUserRoleAssignmentRepository;
  let userService: UserService;

  beforeEach(() => {
    userRepo = new FakeUserRepository();
    roleRepo = new FakeRoleRepository();
    roleRepo.seed(['USER', 'ADMIN', 'RESEARCHER']);
    userRoleRepo = new FakeUserRoleAssignmentRepository(roleRepo);
    userService = new UserService(userRepo, roleRepo, userRoleRepo);
  });

  describe('createUser', () => {
    it('creates a profile and auto-assigns the default USER role', async () => {
      const result = await userService.createUser({
        id: 'a3f1f9a0-1111-4a11-8a11-000000000001',
        email: 'new.user@example.com',
        firstName: 'New',
        lastName: 'User',
      });

      expect(result.status).toBe(UserStatus.PENDING);
      expect(result.roles).toEqual(['USER']);
    });

    it('rejects when a profile with the same id already exists', async () => {
      await userService.createUser({ id: 'dup-id', email: 'a@example.com', firstName: 'A', lastName: 'A' });
      await expect(
        userService.createUser({ id: 'dup-id', email: 'b@example.com', firstName: 'B', lastName: 'B' }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('rejects when a profile with the same email already exists', async () => {
      await userService.createUser({ id: 'id-1', email: 'dup@example.com', firstName: 'A', lastName: 'A' });
      await expect(
        userService.createUser({ id: 'id-2', email: 'dup@example.com', firstName: 'B', lastName: 'B' }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('updateProfile', () => {
    it('updates allowed profile fields', async () => {
      const created = await userService.createUser({ id: 'id-update', email: 'update@example.com', firstName: 'Old', lastName: 'Name' });
      const updated = await userService.updateProfile(created.id, { firstName: 'New', bio: 'Hello world' });

      expect(updated.firstName).toBe('New');
      expect(updated.bio).toBe('Hello world');
      expect(updated.lastName).toBe('Name'); // unchanged
    });

    it('throws NotFoundError for a nonexistent user', async () => {
      await expect(userService.updateProfile('nonexistent', { firstName: 'X' })).rejects.toMatchObject({ statusCode: 404 });
    });

    it('updates the extended profile fields (gender, dateOfBirth, address, country, region, city, timezone)', async () => {
      const created = await userService.createUser({ id: 'id-update-2', email: 'update2@example.com', firstName: 'Old', lastName: 'Name' });
      const updated = await userService.updateProfile(created.id, {
        gender: Gender.FEMALE,
        dateOfBirth: '1990-05-17',
        address: '123 Main St',
        country: 'Ethiopia',
        region: 'Oromia',
        city: 'Adama',
        timezone: 'Africa/Addis_Ababa',
      });

      expect(updated.gender).toBe(Gender.FEMALE);
      expect(updated.dateOfBirth).toBe('1990-05-17');
      expect(updated.address).toBe('123 Main St');
      expect(updated.country).toBe('Ethiopia');
      expect(updated.region).toBe('Oromia');
      expect(updated.city).toBe('Adama');
      expect(updated.timezone).toBe('Africa/Addis_Ababa');
    });
  });

  describe('changeStatus', () => {
    it('allows PENDING -> ACTIVE', async () => {
      const created = await userService.createUser({ id: 'id-status-1', email: 's1@example.com', firstName: 'A', lastName: 'B' });
      const updated = await userService.changeStatus(created.id, { status: UserStatus.ACTIVE }, 'admin-id');
      expect(updated.status).toBe(UserStatus.ACTIVE);
    });

    it('rejects DEACTIVATED -> ACTIVE as an invalid transition', async () => {
      const created = await userService.createUser({ id: 'id-status-2', email: 's2@example.com', firstName: 'A', lastName: 'B' });
      await userService.changeStatus(created.id, { status: UserStatus.DEACTIVATED }, 'admin-id');

      await expect(
        userService.changeStatus(created.id, { status: UserStatus.ACTIVE }, 'admin-id'),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('sets deactivatedAt when transitioning to DEACTIVATED', async () => {
      const created = await userService.createUser({ id: 'id-status-3', email: 's3@example.com', firstName: 'A', lastName: 'B' });
      const updated = await userService.changeStatus(created.id, { status: UserStatus.DEACTIVATED }, 'admin-id');
      expect(updated.deactivatedAt).not.toBeNull();
    });
  });

  describe('role assignment', () => {
    it('assigns and revokes a non-default role', async () => {
      const created = await userService.createUser({ id: 'id-role-1', email: 'r1@example.com', firstName: 'A', lastName: 'B' });

      const withRole = await userService.assignRole(created.id, 'RESEARCHER', 'admin-id');
      expect(withRole.roles).toEqual(expect.arrayContaining(['USER', 'RESEARCHER']));

      const withoutRole = await userService.revokeRole(created.id, 'RESEARCHER', 'admin-id');
      expect(withoutRole.roles).not.toContain('RESEARCHER');
    });

    it('rejects revoking the default USER role', async () => {
      const created = await userService.createUser({ id: 'id-role-2', email: 'r2@example.com', firstName: 'A', lastName: 'B' });
      await expect(userService.revokeRole(created.id, 'USER', 'admin-id')).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects assigning a role that does not exist', async () => {
      const created = await userService.createUser({ id: 'id-role-3', email: 'r3@example.com', firstName: 'A', lastName: 'B' });
      await expect(userService.assignRole(created.id, 'NONEXISTENT', 'admin-id')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('assigns a role with a future expiresAt and the role is still active', async () => {
      const created = await userService.createUser({ id: 'id-role-4', email: 'r4@example.com', firstName: 'A', lastName: 'B' });
      const future = new Date(Date.now() + 60_000).toISOString();

      const withRole = await userService.assignRole(created.id, 'RESEARCHER', 'admin-id', future);
      expect(withRole.roles).toEqual(expect.arrayContaining(['USER', 'RESEARCHER']));
    });

    it('an already-expired expiresAt causes the role to no longer be returned', async () => {
      const created = await userService.createUser({ id: 'id-role-5', email: 'r5@example.com', firstName: 'A', lastName: 'B' });
      const past = new Date(Date.now() - 60_000).toISOString();

      // assign directly through the repo to bypass the service's future-only validation,
      // mirroring a grant that has simply aged past its expiration.
      const role = await roleRepo.findByName('RESEARCHER');
      await userRoleRepo.assign(created.id, role!.id, 'admin-id', new Date(past));

      const result = await userService.getById(created.id);
      expect(result.roles).not.toContain('RESEARCHER');
      expect(result.roles).toContain('USER');
    });

    it('rejects assigning a role with an expiresAt that is already in the past', async () => {
      const created = await userService.createUser({ id: 'id-role-6', email: 'r6@example.com', firstName: 'A', lastName: 'B' });
      const past = new Date(Date.now() - 60_000).toISOString();

      await expect(userService.assignRole(created.id, 'RESEARCHER', 'admin-id', past)).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('listUsers', () => {
    it('paginates and filters by search term', async () => {
      await userService.createUser({ id: 'id-list-1', email: 'alice@example.com', firstName: 'Alice', lastName: 'Smith' });
      await userService.createUser({ id: 'id-list-2', email: 'bob@example.com', firstName: 'Bob', lastName: 'Jones' });

      const result = await userService.listUsers({ search: 'alice', page: 1, pageSize: 20 });
      expect(result.total).toBe(1);
      expect(result.items[0].email).toBe('alice@example.com');
    });
  });
});

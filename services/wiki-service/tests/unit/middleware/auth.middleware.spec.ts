import { Response } from 'express';
import {
  AuthenticatedRequest,
  optionalAuth,
  requireAdmin,
  requireModuleRole,
  requireRoles,
  requireSelfOrRoles,
} from '@api/middleware/auth.middleware';
import { ForbiddenError, UnauthorizedError } from '@common/errors/app-error';
import { IUserRoleAssignmentRepository } from '@domain/repositories/user-role-assignment.repository.interface';

function makeReq(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return { params: {}, ...overrides } as AuthenticatedRequest;
}

const res = {} as Response;

describe('auth.middleware — platform ADMIN override', () => {
  describe('requireRoles', () => {
    it('rejects with UnauthorizedError when there is no authenticated user', () => {
      const next = jest.fn();
      requireRoles('MODULE_TOP_ROLE')(makeReq({ user: undefined }), res, next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('rejects a caller holding neither the allowed role nor ADMIN', () => {
      const next = jest.fn();
      const req = makeReq({ user: { userId: 'u1', email: 'a@b.com', roles: ['SOME_OTHER_ROLE'], jti: 'j1' } });
      requireRoles('MODULE_TOP_ROLE')(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('allows a caller holding the module-local allowed role', () => {
      const next = jest.fn();
      const req = makeReq({ user: { userId: 'u1', email: 'a@b.com', roles: ['MODULE_TOP_ROLE'], jti: 'j1' } });
      requireRoles('MODULE_TOP_ROLE')(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('allows a global platform ADMIN even with no module-local role assignment', () => {
      const next = jest.fn();
      const req = makeReq({ user: { userId: 'u1', email: 'a@b.com', roles: ['ADMIN'], jti: 'j1' } });
      requireRoles('MODULE_TOP_ROLE')(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('requireSelfOrRoles', () => {
    it('allows the resource owner even without the allowed role', () => {
      const next = jest.fn();
      const req = makeReq({
        user: { userId: 'u1', email: 'a@b.com', roles: ['SOME_OTHER_ROLE'], jti: 'j1' },
        params: { userId: 'u1' },
      });
      requireSelfOrRoles('userId', 'MODULE_TOP_ROLE')(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('allows a global platform ADMIN acting on someone else', () => {
      const next = jest.fn();
      const req = makeReq({
        user: { userId: 'admin-1', email: 'admin@ora.local', roles: ['ADMIN'], jti: 'j1' },
        params: { userId: 'someone-else' },
      });
      requireSelfOrRoles('userId', 'MODULE_TOP_ROLE')(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('rejects a non-self caller with neither the allowed role nor ADMIN', () => {
      const next = jest.fn();
      const req = makeReq({
        user: { userId: 'u1', email: 'a@b.com', roles: ['SOME_OTHER_ROLE'], jti: 'j1' },
        params: { userId: 'someone-else' },
      });
      requireSelfOrRoles('userId', 'MODULE_TOP_ROLE')(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });

  describe('requireAdmin', () => {
    it('rejects with UnauthorizedError when there is no authenticated user', () => {
      const next = jest.fn();
      requireAdmin(makeReq({ user: undefined }), res, next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('rejects the module-local top role — catalog management is ADMIN-only, not TOP_ROLE', () => {
      const next = jest.fn();
      const req = makeReq({ user: { userId: 'u1', email: 'a@b.com', roles: ['MODULE_TOP_ROLE'], jti: 'j1' } });
      requireAdmin(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('allows the platform ADMIN', () => {
      const next = jest.fn();
      const req = makeReq({ user: { userId: 'u1', email: 'a@b.com', roles: ['ADMIN'], jti: 'j1' } });
      requireAdmin(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('optionalAuth', () => {
    it('calls next() with no user set when there is no Authorization header', () => {
      const next = jest.fn();
      const req = makeReq({ headers: {} });
      optionalAuth(req, res, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeUndefined();
    });

    it('calls next() with no user set when the header is malformed (not a Bearer token)', () => {
      const next = jest.fn();
      const req = makeReq({ headers: { authorization: 'not-a-bearer-token' } });
      optionalAuth(req, res, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeUndefined();
    });
  });

  describe('requireModuleRole', () => {
    function fakeUserRoleRepo(rolesByUser: Record<string, string[]>): IUserRoleAssignmentRepository {
      return {
        assign: jest.fn(),
        revoke: jest.fn(),
        isAssigned: jest.fn(),
        listRoleNamesForUser: jest.fn(async (userId: string) => rolesByUser[userId] ?? []),
      };
    }

    it('rejects with UnauthorizedError when there is no authenticated user', async () => {
      const next = jest.fn();
      await requireModuleRole(fakeUserRoleRepo({}), 'ADMINISTRATOR')(makeReq({ user: undefined }), res, next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('allows the platform ADMIN override without any wiki_db role assignment', async () => {
      const next = jest.fn();
      const repo = fakeUserRoleRepo({});
      const req = makeReq({ user: { userId: 'admin-1', email: 'a@b.com', roles: ['ADMIN'], jti: 'j1' } });
      await requireModuleRole(repo, 'ADMINISTRATOR', 'BUREAUCRAT')(req, res, next);
      expect(next).toHaveBeenCalledWith();
      expect(repo.listRoleNamesForUser).not.toHaveBeenCalled(); // short-circuits on the JWT override, no DB lookup needed
    });

    it("rejects a caller whose live wiki_db roles don't include an allowed one", async () => {
      const next = jest.fn();
      const repo = fakeUserRoleRepo({ 'u1': ['REGISTERED_EDITOR'] });
      const req = makeReq({ user: { userId: 'u1', email: 'a@b.com', roles: [], jti: 'j1' } });
      await requireModuleRole(repo, 'ADMINISTRATOR', 'BUREAUCRAT')(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('allows a caller holding an allowed role live in wiki_db, even with no ADMIN in their JWT', async () => {
      const next = jest.fn();
      const repo = fakeUserRoleRepo({ 'u1': ['BUREAUCRAT'] });
      const req = makeReq({ user: { userId: 'u1', email: 'a@b.com', roles: [], jti: 'j1' } });
      await requireModuleRole(repo, 'ADMINISTRATOR', 'BUREAUCRAT')(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });
  });
});

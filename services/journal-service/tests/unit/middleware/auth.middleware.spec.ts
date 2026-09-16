import { Response } from 'express';
import { AuthenticatedRequest, requireAdmin, requireRoles, requireSelfOrRoles } from '@api/middleware/auth.middleware';
import { ForbiddenError, UnauthorizedError } from '@common/errors/app-error';

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
});

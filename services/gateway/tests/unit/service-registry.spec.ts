import { findRoute, isPublicOverride, serviceRoutes } from '@config/service-registry';

describe('service-registry', () => {
  describe('findRoute', () => {
    it('matches an exact prefix', () => {
      expect(findRoute('/api/v1/users')?.serviceName).toBe('user-service');
    });

    it('matches a nested path under a prefix', () => {
      expect(findRoute('/api/v1/users/123/roles')?.serviceName).toBe('user-service');
    });

    it('does not match a similarly-named but distinct prefix', () => {
      // /api/v1/usersomething should NOT match /api/v1/users
      expect(findRoute('/api/v1/usersomething')).toBeUndefined();
    });

    it('returns undefined for an unknown path', () => {
      expect(findRoute('/api/v1/nonexistent')).toBeUndefined();
    });
  });

  describe('isPublicOverride', () => {
    it('treats POST /auth/login as public even though /auth requires no blanket auth already', () => {
      expect(isPublicOverride('POST', '/api/v1/auth/login')).toBe(true);
    });

    it('treats an unrelated auth path as not publicly overridden', () => {
      expect(isPublicOverride('POST', '/api/v1/auth/mfa/enroll')).toBe(false);
    });

    it('treats POST /auth/password-reset/request as public via matchPrefix', () => {
      expect(isPublicOverride('POST', '/api/v1/auth/password-reset/request')).toBe(true);
    });

    it('treats POST /users as public — account creation happens before login', () => {
      expect(isPublicOverride('POST', '/api/v1/users')).toBe(true);
    });

    it('does NOT treat GET /users as public even though it shares a path with the public POST', () => {
      expect(isPublicOverride('GET', '/api/v1/users')).toBe(false);
    });

    it('does NOT treat PATCH /users/:id as public via prefix leakage from the POST /users override', () => {
      expect(isPublicOverride('PATCH', '/api/v1/users/some-id')).toBe(false);
    });
  });

  it('every implemented route points at a non-empty target', () => {
    for (const route of serviceRoutes.filter((r) => r.implemented)) {
      expect(route.target.length).toBeGreaterThan(0);
    }
  });
});

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
    it('treats /auth/login as public even though /auth requires no blanket auth already', () => {
      expect(isPublicOverride('/api/v1/auth/login')).toBe(true);
    });

    it('treats an unrelated auth path as not publicly overridden', () => {
      expect(isPublicOverride('/api/v1/auth/mfa/enroll')).toBe(false);
    });
  });

  it('every implemented route points at a non-empty target', () => {
    for (const route of serviceRoutes.filter((r) => r.implemented)) {
      expect(route.target.length).toBeGreaterThan(0);
    }
  });
});

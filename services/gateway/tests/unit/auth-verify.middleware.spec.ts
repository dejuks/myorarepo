import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { authVerifyMiddleware, GatewayRequest } from '@middleware/auth-verify.middleware';
import { UnauthorizedError } from '@common/errors/app-error';

const SECRET = 'test_access_secret_at_least_32_characters_long';

function makeReq(path: string, authHeader?: string): GatewayRequest {
  return { path, headers: authHeader ? { authorization: authHeader } : {} } as unknown as GatewayRequest;
}

describe('authVerifyMiddleware', () => {
  it('allows a public route through with no token', () => {
    const req = makeReq('/api/v1/auth/login');
    const next = jest.fn();
    authVerifyMiddleware(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith(); // called with no error
  });

  it('rejects a protected route with no Authorization header', () => {
    const req = makeReq('/api/v1/users/me');
    const next = jest.fn();
    authVerifyMiddleware(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('rejects a protected route with a malformed token', () => {
    const req = makeReq('/api/v1/users/me', 'Bearer not-a-real-token');
    const next = jest.fn();
    authVerifyMiddleware(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('allows a protected route through with a valid token and attaches userId', () => {
    const token = jwt.sign({ sub: 'user-123' }, SECRET, {
      issuer: 'ora-platform',
      audience: 'ora-platform-clients',
      expiresIn: '15m',
    });
    const req = makeReq('/api/v1/users/me', `Bearer ${token}`);
    const next = jest.fn();
    authVerifyMiddleware(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.userId).toBe('user-123');
  });

  it('rejects an expired token', () => {
    const token = jwt.sign({ sub: 'user-123' }, SECRET, {
      issuer: 'ora-platform',
      audience: 'ora-platform-clients',
      expiresIn: '-1s',
    });
    const req = makeReq('/api/v1/users/me', `Bearer ${token}`);
    const next = jest.fn();
    authVerifyMiddleware(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('does not require auth for a route not in the registry (falls through to 404 downstream)', () => {
    const req = makeReq('/api/v1/nonexistent');
    const next = jest.fn();
    authVerifyMiddleware(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith();
  });
});

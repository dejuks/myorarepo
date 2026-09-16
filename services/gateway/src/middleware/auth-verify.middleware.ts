import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@config/env';
import { UnauthorizedError } from '@common/errors/app-error';
import { findRoute, isPublicOverride } from '@config/service-registry';

export interface GatewayRequest extends Request {
  userId?: string;
}

/**
 * Edge-level JWT check: verifies signature and expiry only, so obviously
 * invalid/expired/missing tokens are rejected before wasting a proxied
 * round-trip to a downstream service. This is NOT the full auth check —
 * it does not look at the Redis blacklist or enforce roles. Each
 * downstream service still performs its own complete verification
 * (blacklist, roles) on every request. See docs/01-architecture.md §3:
 * "Gateway is boundary enforcement, not business logic."
 */
export function authVerifyMiddleware(req: GatewayRequest, _res: Response, next: NextFunction): void {
  const route = findRoute(req.path);

  const needsAuth = route ? route.requiresAuth && !isPublicOverride(req.method, req.path) : false;
  if (!needsAuth) return next();

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = header.substring('Bearer '.length);
  try {
    const claims = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    }) as { sub: string };
    req.userId = claims.sub;
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired access token'));
  }
}

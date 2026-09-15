import jwt from 'jsonwebtoken';
import { env } from '@config/env';

export interface AccessTokenClaims {
  sub: string;
  email: string;
  roles: string[];
  jti: string;
  type: 'access';
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  }) as AccessTokenClaims;
}

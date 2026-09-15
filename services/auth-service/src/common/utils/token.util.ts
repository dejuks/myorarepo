import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { env } from '@config/env';

export interface AccessTokenClaims {
  sub: string; // userId
  email: string;
  roles: string[];
  jti: string;
  type: 'access';
}

export interface RefreshTokenClaims {
  sub: string;
  jti: string;
  type: 'refresh';
}

export function signAccessToken(payload: Omit<AccessTokenClaims, 'jti' | 'type'>): { token: string; jti: string } {
  const jti = uuidv4();
  const token = jwt.sign({ ...payload, jti, type: 'access' }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  } as SignOptions);
  return { token, jti };
}

export function signRefreshToken(userId: string): { token: string; jti: string } {
  const jti = uuidv4();
  const token = jwt.sign({ sub: userId, jti, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  } as SignOptions);
  return { token, jti };
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  }) as AccessTokenClaims;
}

export function verifyRefreshToken(token: string): RefreshTokenClaims {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  }) as RefreshTokenClaims;
}

export function decodeTokenExpiry(token: string): Date {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  if (!decoded?.exp) throw new Error('Token has no expiry claim');
  return new Date(decoded.exp * 1000);
}

/** Refresh tokens are hashed before persistence — the DB never holds a usable raw token. */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function generateSecureRandomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

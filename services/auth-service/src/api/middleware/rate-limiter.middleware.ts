import rateLimit from 'express-rate-limit';
import { env } from '@config/env';

/**
 * Per-IP rate limit on the login endpoint, on top of the per-account
 * Redis-backed lockout implemented in AuthService (see incrementLoginAttempts).
 * This layer protects against distributed low-and-slow credential stuffing
 * across many accounts from the same source.
 */
export const loginRateLimiter = rateLimit({
  windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MS,
  limit: env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS * 4,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts from this address, try again later' },
  },
});

export const globalRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

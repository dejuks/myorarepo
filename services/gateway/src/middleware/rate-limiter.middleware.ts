import rateLimit from 'express-rate-limit';
import { env } from '@config/env';

/** Global per-client-IP limit applied to every request. */
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, slow down' } },
});

/** Tighter limit specifically on auth endpoints (login/register/refresh) — brute-force protection at the edge, on top of auth-service's own per-account lockout. */
export const authRateLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many auth requests, try again later' } },
});

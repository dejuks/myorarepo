import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { logger } from '@common/logger/logger';

/** Assigns/propagates a correlation ID and logs every request — this is the ID downstream services should log against too, for end-to-end tracing across the proxied hop. */
export const requestLoggerMiddleware = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers['x-correlation-id'];
    const id = (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
    req.headers['x-correlation-id'] = id;
    res.setHeader('x-correlation-id', id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  redact: ['req.headers.authorization'],
});

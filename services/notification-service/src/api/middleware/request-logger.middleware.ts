import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { logger } from '@common/logger/logger';

export const requestLoggerMiddleware = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers['x-correlation-id'];
    const id = (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
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

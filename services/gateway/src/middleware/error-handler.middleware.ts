import { NextFunction, Request, Response } from 'express';
import { AppError } from '@common/errors/app-error';
import { logger } from '@common/logger/logger';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandlerMiddleware(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path, method: req.method }, err.message);
    } else {
      logger.warn({ code: err.code, path: req.path, method: req.method }, err.message);
    }
    res.status(err.statusCode).json({ success: false, error: { code: err.code, message: err.message } });
    return;
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled gateway error');
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
}

export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({ success: false, error: { code: 'ROUTE_NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
}

import { NextFunction, Request, Response } from 'express';
import { AppError } from '@common/errors/app-error';
import { logger } from '@common/logger/logger';

/**
 * Centralized error-handling middleware — every controller forwards errors
 * here via next(err) instead of formatting responses itself. Operational
 * (expected) errors are returned with their own status/code; anything
 * unexpected is logged in full and returned as a generic 500 so internals
 * never leak to clients.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandlerMiddleware(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError && err.isOperational) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path, method: req.method }, err.message);
    } else {
      logger.warn({ code: err.code, path: req.path, method: req.method }, err.message);
    }

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...('details' in err ? { details: (err as unknown as { details: unknown }).details } : {}),
      },
    });
    return;
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}

export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: { code: 'ROUTE_NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
}

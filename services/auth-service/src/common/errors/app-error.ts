/**
 * Base class for all handled application errors.
 * The global error middleware maps these to consistent HTTP responses.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public readonly details: unknown;
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Invalid credentials') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many attempts, please try again later') {
    super(message, 429, 'TOO_MANY_REQUESTS');
  }
}

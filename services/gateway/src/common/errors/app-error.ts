export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Upstream service is unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Route not found') {
    super(message, 404, 'ROUTE_NOT_FOUND');
  }
}

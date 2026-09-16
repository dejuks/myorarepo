import { NextFunction, Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError as CVValidationError } from 'class-validator';
import { ValidationError } from '@common/errors/app-error';

type ClassConstructor<T> = new (...args: unknown[]) => T;

function flattenErrors(errors: CVValidationError[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const error of errors) {
    if (error.constraints) result[error.property] = Object.values(error.constraints);
    if (error.children?.length) Object.assign(result, flattenErrors(error.children));
  }
  return result;
}

export function validateDto<T extends object>(dtoClass: ClassConstructor<T>) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const instance = plainToInstance(dtoClass, req.body);
    const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true });
    if (errors.length > 0) return next(new ValidationError('Request validation failed', flattenErrors(errors)));
    req.body = instance;
    next();
  };
}

export function validateQueryDto<T extends object>(dtoClass: ClassConstructor<T>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const instance = plainToInstance(dtoClass, req.query);
    const errors = await validate(instance, { whitelist: true });
    if (errors.length > 0) return next(new ValidationError('Query validation failed', flattenErrors(errors)));
    res.locals.query = instance;
    next();
  };
}

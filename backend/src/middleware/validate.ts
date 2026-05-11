import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

interface ValidateOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validate(schemas: ValidateOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Record<string, string[]> = {};

    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        errors.body = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      }
    }

    try {
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        errors.query = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      }
    }

    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        errors.params = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      }
    }

    if (Object.keys(errors).length > 0) {
    res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      errors,
    });
    return;
  }

    next();
  };
}

export default validate;

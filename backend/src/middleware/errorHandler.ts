import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino({ name: 'errorHandler' });

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.isOperational ? err.message : 'An unexpected error occurred';

  // Log error
  if (statusCode >= 500) {
    logger.error(
      {
        err,
        url: req.url,
        method: req.method,
        statusCode,
        code,
      },
      'Server error'
    );
  } else {
    logger.warn(
      {
        url: req.url,
        method: req.method,
        statusCode,
        code,
      },
      'Client error'
    );
  }

  // Don't leak stack trace in production
  const stack = process.env.NODE_ENV === 'development' ? err.stack : undefined;

  res.status(statusCode).json({
    status: 'error',
    code,
    message,
    ...(stack && { stack }),
  });
}

export class HttpError extends Error implements AppError {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    status: 'error',
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.url} not found`,
  });
}

export default errorHandler;

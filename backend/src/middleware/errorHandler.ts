import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import { ResponseUtil } from '../utils/apiResponse.js';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  logger.error('Unhandled API Error', 'ErrorHandler', {
    url: req.originalUrl,
    method: req.method,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return ResponseUtil.error(
      res,
      'Request validation error',
      'VALIDATION_ERROR',
      err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message
      })),
      400
    );
  }

  // Handle Mongoose CastError or ValidationError
  if (err.name === 'ValidationError') {
    return ResponseUtil.error(res, err.message, 'DATABASE_VALIDATION_ERROR', undefined, 400);
  }

  if (err.name === 'CastError') {
    return ResponseUtil.error(res, 'Invalid document ID format', 'INVALID_ID', undefined, 400);
  }

  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const message =
    statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'An unexpected internal error occurred'
      : err.message || 'Internal server error';

  return ResponseUtil.error(res, message, errorCode, err.details, statusCode);
};

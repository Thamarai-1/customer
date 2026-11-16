import { Response } from 'express';
import { ApiResponse } from '../types/index.js';

export class ResponseUtil {
  static success<T>(
    res: Response,
    message: string,
    data?: T,
    meta?: Record<string, unknown>,
    statusCode = 200
  ): Response {
    const payload: ApiResponse<T> = {
      success: true,
      message,
      ...(data !== undefined ? { data } : {}),
      ...(meta !== undefined ? { meta } : {}),
      timestamp: new Date().toISOString()
    };
    return res.status(statusCode).json(payload);
  }

  static error(
    res: Response,
    message: string,
    code = 'INTERNAL_ERROR',
    details?: unknown,
    statusCode = 500,
    errors?: unknown[]
  ): Response {
    const payload: ApiResponse = {
      success: false,
      message,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {})
      },
      ...(errors !== undefined ? { errors } : { errors: details ? (Array.isArray(details) ? details : [details]) : [] }),
      timestamp: new Date().toISOString()
    };
    return res.status(statusCode).json(payload);
  }
}

import { Response } from 'express';
import { ApiResponse } from '../types/index.js';

export class ResponseUtil {
  static success<T>(res: Response, message: string, data?: T, statusCode = 200): Response {
    const payload: ApiResponse<T> = {
      success: true,
      message,
      ...(data !== undefined ? { data } : {}),
      timestamp: new Date().toISOString()
    };
    return res.status(statusCode).json(payload);
  }

  static error(
    res: Response,
    message: string,
    code = 'INTERNAL_ERROR',
    details?: unknown,
    statusCode = 500
  ): Response {
    const payload: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {})
      },
      timestamp: new Date().toISOString()
    };
    return res.status(statusCode).json(payload);
  }
}

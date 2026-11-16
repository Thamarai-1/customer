import { Request, Response } from 'express';
import { ResponseUtil } from '../utils/apiResponse.js';

export const notFoundHandler = (req: Request, res: Response): Response => {
  return ResponseUtil.error(
    res,
    `Resource not found: ${req.method} ${req.originalUrl}`,
    'NOT_FOUND',
    undefined,
    404
  );
};

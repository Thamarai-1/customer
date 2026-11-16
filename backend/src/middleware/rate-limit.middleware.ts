import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { ResponseUtil } from '../utils/apiResponse.js';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 login requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    ResponseUtil.error(
      res,
      'Too many login attempts. Please try again after 15 minutes.',
      'RATE_LIMITED',
      undefined,
      429
    );
  }
});

import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ResponseUtil } from '../utils/apiResponse.js';

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      // Assign parsed values back to prevent prototype pollution and enforce schema
      req.body = parsed.body ?? req.body;
      req.query = (parsed.query ?? req.query) as Request['query'];
      req.params = (parsed.params ?? req.params) as Request['params'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorDetails = error.errors.map((e) => ({
          field: e.path.filter((p) => p !== 'body' && p !== 'query' && p !== 'params').join('.') || e.path.join('.'),
          message: e.message
        }));
        ResponseUtil.error(
          res,
          'Validation failed',
          'VALIDATION_ERROR',
          errorDetails,
          400,
          errorDetails
        );
        return;
      }
      next(error);
    }
  };
};

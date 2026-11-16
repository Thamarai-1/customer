import { Request, Response } from 'express';
import { AIProviderFactory } from './ai-provider.factory.js';
import { ResponseUtil } from '../../utils/apiResponse.js';

export class AIController {
  static listProviders(_req: Request, res: Response): void {
    try {
      const providers = AIProviderFactory.listProviders();
      ResponseUtil.success(res, 'AI providers status retrieved successfully', providers, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve AI providers';
      ResponseUtil.error(res, message, 'AI_PROVIDER_ERROR', undefined, 500);
    }
  }
}

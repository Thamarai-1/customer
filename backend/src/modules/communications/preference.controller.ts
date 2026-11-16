import { Request, Response } from 'express';
import { PreferenceService } from './preference.service.js';
import { ResponseUtil } from '../../utils/apiResponse.js';

export class PreferenceController {
  static async getForCustomer(req: Request, res: Response): Promise<void> {
    const customerId = req.params.id as string;
    try {
      const preferences = await PreferenceService.getPreferences(customerId);
      ResponseUtil.success(res, 'Communication preferences retrieved', preferences, undefined, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'CUSTOMER_NOT_FOUND') {
        ResponseUtil.error(res, `Customer '${customerId}' not found`, 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, 'Failed to retrieve preferences', 'INTERNAL_SERVER_ERROR', undefined, 500);
    }
  }

  static async updateForCustomer(req: Request, res: Response): Promise<void> {
    const customerId = req.params.id as string;
    try {
      const preferences = await PreferenceService.updatePreferences(customerId, req.body);
      ResponseUtil.success(res, 'Communication preferences updated', preferences, undefined, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'CUSTOMER_NOT_FOUND') {
        ResponseUtil.error(res, `Customer '${customerId}' not found`, 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, 'Failed to update preferences', 'INTERNAL_SERVER_ERROR', undefined, 500);
    }
  }
}

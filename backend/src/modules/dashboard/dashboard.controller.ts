import { Request, Response } from 'express';
import { DashboardService } from './dashboard.service.js';
import { ResponseUtil } from '../../utils/apiResponse.js';

export class DashboardController {
  /**
   * GET /api/v1/dashboard/overview
   */
  static async getOverview(_req: Request, res: Response): Promise<void> {
    try {
      const overview = await DashboardService.getOverview();
      ResponseUtil.success(res, 'Executive overview generated successfully', overview);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      ResponseUtil.error(res, message, 'DASHBOARD_OVERVIEW_FAILED', undefined, 500);
    }
  }
}

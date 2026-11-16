import { Request, Response } from 'express';
import { ActivityService } from './activity.service.js';
import { ResponseUtil } from '../../utils/apiResponse.js';
import { getPaginationParams } from '../../utils/pagination.js';
import { ActivityType } from './activity.model.js';

export class ActivityController {
  static async create(req: Request, res: Response): Promise<void> {
    const customerId = req.params.id as string;
    try {
      const activity = await ActivityService.createActivity(customerId, req.body);
      ResponseUtil.success(res, 'Activity logged successfully', activity, undefined, 201);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'CUSTOMER_NOT_FOUND') {
        ResponseUtil.error(res, `Customer '${customerId}' not found`, 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, 'Failed to log activity', 'INTERNAL_SERVER_ERROR', undefined, 500);
    }
  }

  static async list(req: Request, res: Response): Promise<void> {
    const customerId = req.params.id as string;
    try {
      const pagination = getPaginationParams(req.query as Record<string, unknown>);
      const filters = {
        activityType: req.query.activityType as ActivityType,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const result = await ActivityService.getActivities(customerId, pagination, filters);
      ResponseUtil.success(res, 'Activities retrieved successfully', result.activities, result.meta, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'CUSTOMER_NOT_FOUND') {
        ResponseUtil.error(res, `Customer '${customerId}' not found`, 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, 'Failed to retrieve activities', 'INTERNAL_SERVER_ERROR', undefined, 500);
    }
  }

  static async getSummary(req: Request, res: Response): Promise<void> {
    const customerId = req.params.id as string;
    try {
      const summary = await ActivityService.getActivitySummary(customerId);
      ResponseUtil.success(res, 'Activity summary calculated successfully', summary, undefined, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'CUSTOMER_NOT_FOUND') {
        ResponseUtil.error(res, `Customer '${customerId}' not found`, 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, 'Failed to calculate activity summary', 'INTERNAL_SERVER_ERROR', undefined, 500);
    }
  }
}

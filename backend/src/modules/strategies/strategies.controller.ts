import { Request, Response } from 'express';
import { StrategiesService } from './strategies.service.js';
import { CustomerSegmentType } from '../segmentation/segmentation.constants.js';
import { ResponseUtil } from '../../utils/apiResponse.js';

export class StrategiesController {
  static async list(_req: Request, res: Response): Promise<void> {
    try {
      const configs = await StrategiesService.listConfigs();
      ResponseUtil.success(res, 'Strategy configurations retrieved successfully', configs, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list strategy configs';
      ResponseUtil.error(res, message, 'STRATEGY_LIST_ERROR', undefined, 500);
    }
  }

  static async getBySegment(req: Request, res: Response): Promise<void> {
    try {
      const segmentName = req.params.segmentName as CustomerSegmentType;
      const config = await StrategiesService.getConfigBySegment(segmentName);
      ResponseUtil.success(res, 'Strategy configuration retrieved successfully', config, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve strategy config';
      if (message === 'STRATEGY_CONFIG_NOT_FOUND') {
        ResponseUtil.error(res, 'Strategy configuration not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'STRATEGY_GET_ERROR', undefined, 500);
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const segmentName = req.params.segmentName as CustomerSegmentType;
      const updated = await StrategiesService.updateConfig(segmentName, req.body);
      ResponseUtil.success(res, 'Strategy configuration updated successfully', updated, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update strategy config';
      ResponseUtil.error(res, message, 'STRATEGY_UPDATE_ERROR', undefined, 500);
    }
  }

  static async evaluateCustomer(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.params.customerId as string;
      const evaluation = await StrategiesService.evaluateCustomerStrategy(customerId);
      ResponseUtil.success(res, 'Customer strategy evaluated successfully', evaluation, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to evaluate customer strategy';
      if (message === 'CUSTOMER_NOT_FOUND') {
        ResponseUtil.error(res, 'Customer not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'STRATEGY_EVALUATION_ERROR', undefined, 500);
    }
  }
}

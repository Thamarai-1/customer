import { Request, Response } from 'express';
import { PolicyEngineService } from './policy-engine.service.js';
import { ResponseUtil } from '../../utils/apiResponse.js';

export class PolicyEngineController {
  static async evaluate(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.params.customerId as string;
      const channel = req.query.channel as string | undefined;

      const report = await PolicyEngineService.evaluateCustomerPolicy(customerId, { channel });
      ResponseUtil.success(res, 'Policy evaluation completed successfully', report, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to evaluate customer policy';
      if (message === 'CUSTOMER_NOT_FOUND') {
        ResponseUtil.error(res, 'Customer not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'POLICY_EVALUATION_ERROR', undefined, 500);
    }
  }

  static async getLatest(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.params.customerId as string;
      const report = await PolicyEngineService.getLatestEvaluation(customerId);
      if (!report) {
        ResponseUtil.error(res, 'No policy evaluation found for this customer', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.success(res, 'Latest policy evaluation retrieved successfully', report, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve latest policy evaluation';
      if (message === 'CUSTOMER_NOT_FOUND') {
        ResponseUtil.error(res, 'Customer not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'POLICY_EVALUATION_GET_ERROR', undefined, 500);
    }
  }
}

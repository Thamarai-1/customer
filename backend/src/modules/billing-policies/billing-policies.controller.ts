import { Request, Response } from 'express';
import { BillingPoliciesService } from './billing-policies.service.js';
import { ResponseUtil } from '../../utils/apiResponse.js';

export class BillingPoliciesController {
  static async getConfig(_req: Request, res: Response): Promise<void> {
    try {
      const config = await BillingPoliciesService.getConfig();
      ResponseUtil.success(res, 'Billing policy configuration retrieved successfully', config, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve billing policy config';
      ResponseUtil.error(res, message, 'BILLING_POLICY_GET_ERROR', undefined, 500);
    }
  }

  static async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const updated = await BillingPoliciesService.updateConfig(req.body);
      ResponseUtil.success(res, 'Billing policy configuration updated successfully', updated, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update billing policy config';
      ResponseUtil.error(res, message, 'BILLING_POLICY_UPDATE_ERROR', undefined, 500);
    }
  }

  static async evaluateCustomer(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.params.customerId as string;
      const evaluation = await BillingPoliciesService.evaluateCustomerBilling(customerId);
      ResponseUtil.success(res, 'Customer billing reminder evaluation completed', evaluation, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to evaluate customer billing';
      if (message === 'CUSTOMER_NOT_FOUND') {
        ResponseUtil.error(res, 'Customer not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'BILLING_EVALUATION_ERROR', undefined, 500);
    }
  }
}

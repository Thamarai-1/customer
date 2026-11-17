import { Request, Response } from 'express';
import { DeliveryService } from './delivery.service.js';
import { CreateDeliverySchema, DeliveryQuerySchema } from './delivery.schema.js';
import { ResponseUtil } from '../../utils/apiResponse.js';
import { getPaginationParams } from '../../utils/pagination.js';
import { DeliveryStatus } from './delivery.constants.js';

export class DeliveryController {
  /**
   * POST /api/v1/deliveries
   * Creates a controlled delivery attempt (MOCK or DRAFT_ONLY).
   */
  static async createDelivery(req: Request, res: Response): Promise<void> {
    try {
      const parsed = CreateDeliverySchema.parse(req.body);
      const actor = req.user ? { id: req.user.id, name: req.user.email } : undefined;

      const record = await DeliveryService.executeDelivery(parsed, actor);

      if (record.status === DeliveryStatus.BLOCKED) {
        ResponseUtil.error(
          res,
          `Delivery blocked: ${record.errorMessage}`,
          'DELIVERY_PRECONDITION_FAILED',
          {
            deliveryId: record._id,
            status: record.status,
            errorCode: record.errorCode,
            errorMessage: record.errorMessage
          },
          422
        );
        return;
      }

      ResponseUtil.success(
        res,
        record.deliveryMode === 'MOCK' ? 'Mock delivery executed successfully' : 'Draft record created successfully',
        record,
        undefined,
        201
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      ResponseUtil.error(res, message, 'DELIVERY_EXECUTION_FAILED', undefined, 400);
    }
  }

  /**
   * GET /api/v1/deliveries
   * Paginated listing of deliveries with filtering.
   */
  static async listDeliveries(req: Request, res: Response): Promise<void> {
    try {
      const pagination = getPaginationParams(req.query);
      const query = DeliveryQuerySchema.parse(req.query);

      const filters = {
        customerId: query.customerId,
        campaignId: query.campaignId,
        status: query.status,
        channel: query.channel,
        deliveryMode: query.deliveryMode,
        startDate: query.startDate,
        endDate: query.endDate
      };

      const result = await DeliveryService.listDeliveries(pagination, filters);
      ResponseUtil.success(res, 'Deliveries fetched successfully', result.data, result.meta);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      ResponseUtil.error(res, message, 'DELIVERY_LIST_FAILED', undefined, 400);
    }
  }

  /**
   * GET /api/v1/deliveries/dashboard/stats
   * Summary metrics of delivery performance.
   */
  static async getDashboardStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await DeliveryService.getDashboardStats();
      ResponseUtil.success(res, 'Delivery statistics calculated successfully', stats);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      ResponseUtil.error(res, message, 'STATS_FETCH_FAILED', undefined, 500);
    }
  }

  /**
   * GET /api/v1/deliveries/customers/:customerId
   * Delivery history for a specific customer.
   */
  static async getDeliveriesByCustomer(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.params.customerId || '';
      if (!customerId) {
        ResponseUtil.error(res, 'Customer ID is required', 'INVALID_PARAM', undefined, 400);
        return;
      }

      const records = await DeliveryService.getDeliveriesByCustomer(customerId);
      ResponseUtil.success(res, `Deliveries for customer ${customerId} fetched successfully`, records);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      ResponseUtil.error(res, message, 'CUSTOMER_DELIVERIES_FAILED', undefined, 500);
    }
  }

  /**
   * GET /api/v1/deliveries/:deliveryId
   * Detailed delivery record.
   */
  static async getDeliveryDetails(req: Request, res: Response): Promise<void> {
    try {
      const deliveryId = req.params.deliveryId || '';
      const record = await DeliveryService.getDeliveryById(deliveryId);

      if (!record) {
        ResponseUtil.error(res, 'Delivery record not found', 'NOT_FOUND', undefined, 404);
        return;
      }

      ResponseUtil.success(res, 'Delivery record retrieved', record);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      ResponseUtil.error(res, message, 'GET_DELIVERY_FAILED', undefined, 500);
    }
  }

  /**
   * POST /api/v1/deliveries/:deliveryId/retry
   * Retries an eligible failed delivery.
   */
  static async retryDelivery(req: Request, res: Response): Promise<void> {
    try {
      const deliveryId = req.params.deliveryId || '';
      const actor = req.user ? { id: req.user.id, name: req.user.email } : undefined;

      const retried = await DeliveryService.retryDelivery(deliveryId, actor);
      ResponseUtil.success(res, 'Delivery retry executed successfully', retried);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.startsWith('CANNOT_RETRY')) {
        ResponseUtil.error(res, message, 'CANNOT_RETRY', undefined, 409);
        return;
      }
      if (message.startsWith('DELIVERY_NOT_FOUND')) {
        ResponseUtil.error(res, message, 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'RETRY_FAILED', undefined, 400);
    }
  }
}

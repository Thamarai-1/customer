import { Request, Response } from 'express';
import { SegmentationService } from './segmentation.service.js';
import { CustomerSegmentType, ClassificationStatus } from './segmentation.constants.js';
import { ResponseUtil } from '../../utils/apiResponse.js';
import { getPaginationParams } from '../../utils/pagination.js';

export class SegmentationController {
  /**
   * POST /api/v1/segmentation/customers/:customerId/classify
   */
  static async classifyCustomer(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.params.customerId as string;
      const result = await SegmentationService.classifyCustomer(customerId);
      ResponseUtil.success(res, 'Customer classified successfully', result, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to classify customer';
      if (message === 'CUSTOMER_NOT_FOUND') {
        ResponseUtil.error(res, 'Customer record not found', 'CUSTOMER_NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'CLASSIFICATION_ERROR', undefined, 500);
    }
  }

  /**
   * GET /api/v1/segmentation/customers/:customerId
   */
  static async getCustomerClassification(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.params.customerId as string;
      const result = await SegmentationService.getCustomerClassification(customerId);
      ResponseUtil.success(res, 'Customer classification retrieved successfully', result, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve classification';
      if (message === 'CUSTOMER_NOT_FOUND') {
        ResponseUtil.error(res, 'Customer record not found', 'CUSTOMER_NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'RETRIEVAL_ERROR', undefined, 500);
    }
  }

  /**
   * POST /api/v1/segmentation/classify-all
   */
  static async classifyAll(req: Request, res: Response): Promise<void> {
    try {
      const batchSize = req.body.batchSize ? Number(req.body.batchSize) : 100;
      const summary = await SegmentationService.classifyAll(batchSize);
      ResponseUtil.success(res, 'Batch customer classification completed successfully', summary, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Batch classification failed';
      ResponseUtil.error(res, message, 'BATCH_CLASSIFICATION_ERROR', undefined, 500);
    }
  }

  /**
   * GET /api/v1/segmentation/segments
   */
  static async getSegmentDefinitions(_req: Request, res: Response): Promise<void> {
    try {
      const segments = SegmentationService.getSegmentDefinitions();
      ResponseUtil.success(res, 'Segment definitions retrieved successfully', segments, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve segment definitions';
      ResponseUtil.error(res, message, 'DEFINITIONS_ERROR', undefined, 500);
    }
  }

  /**
   * GET /api/v1/segmentation/segments/:segmentName/customers
   */
  static async getCustomersBySegment(req: Request, res: Response): Promise<void> {
    try {
      const segmentName = (req.params.segmentName as string).toUpperCase();
      const validSegment =
        segmentName === 'ALL' || Object.values(CustomerSegmentType).includes(segmentName as CustomerSegmentType);

      if (!validSegment) {
        ResponseUtil.error(
          res,
          `Invalid segment name '${segmentName}'. Allowed: ${Object.values(CustomerSegmentType).join(', ')}, ALL`,
          'INVALID_SEGMENT_NAME',
          undefined,
          400
        );
        return;
      }

      const pagination = getPaginationParams(req.query as Record<string, unknown>, 'classifiedAt', -1);
      const filters = {
        primarySegment: req.query.primarySegment as CustomerSegmentType | undefined,
        status: req.query.status as ClassificationStatus | undefined,
        minConfidence: req.query.minConfidence ? Number(req.query.minConfidence) : undefined,
        search: req.query.search as string | undefined
      };

      const result = await SegmentationService.getCustomersBySegment(
        segmentName as CustomerSegmentType | 'ALL',
        pagination,
        filters
      );

      ResponseUtil.success(
        res,
        'Segment customer classifications retrieved successfully',
        result.classifications,
        result.meta as unknown as Record<string, unknown>,
        200
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to query segment customers';
      ResponseUtil.error(res, message, 'QUERY_ERROR', undefined, 500);
    }
  }

  /**
   * GET /api/v1/segmentation/statistics
   */
  static async getStatistics(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await SegmentationService.getStatistics();
      ResponseUtil.success(res, 'Segmentation statistics calculated successfully', stats, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to calculate segmentation statistics';
      ResponseUtil.error(res, message, 'STATISTICS_ERROR', undefined, 500);
    }
  }

  /**
   * GET /api/v1/segmentation/customers/:customerId/history
   */
  static async getCustomerClassificationHistory(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.params.customerId as string;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const history = await SegmentationService.getCustomerClassificationHistory(customerId, limit);
      ResponseUtil.success(res, 'Customer classification history retrieved successfully', history, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve classification history';
      if (message === 'CUSTOMER_NOT_FOUND') {
        ResponseUtil.error(res, 'Customer record not found', 'CUSTOMER_NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'HISTORY_ERROR', undefined, 500);
    }
  }

  /**
   * GET /api/v1/segmentation/config
   */
  static async getConfig(_req: Request, res: Response): Promise<void> {
    try {
      const config = await SegmentationService.getActiveConfig();
      ResponseUtil.success(res, 'Segmentation configuration retrieved successfully', config, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve segmentation configuration';
      ResponseUtil.error(res, message, 'CONFIG_ERROR', undefined, 500);
    }
  }

  /**
   * PUT /api/v1/segmentation/config
   */
  static async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const userIdentifier = req.user?.email || req.user?.id || 'ADMIN';
      const updatedConfig = await SegmentationService.updateConfig(req.body, userIdentifier);
      ResponseUtil.success(res, 'Segmentation configuration updated successfully', updatedConfig, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update segmentation configuration';
      ResponseUtil.error(res, message, 'CONFIG_UPDATE_ERROR', undefined, 500);
    }
  }
}

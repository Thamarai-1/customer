import { Request, Response } from 'express';
import { ComplianceService } from './compliance.service.js';
import { ResponseUtil } from '../../utils/apiResponse.js';
import { getPaginationParams } from '../../utils/pagination.js';

export class ComplianceController {
  /**
   * Executes validation for a specific generated message draft.
   */
  static async validate(req: Request, res: Response): Promise<void> {
    try {
      const messageId = req.params.messageId as string;
      const report = await ComplianceService.validateMessage(messageId);
      ResponseUtil.success(res, 'Compliance validation completed successfully', report, undefined, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to validate message compliance';
      if (message === 'INVALID_MESSAGE_ID' || message === 'MESSAGE_NOT_FOUND') {
        ResponseUtil.error(res, 'Message draft not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      if (message.includes('CUSTOMER_NOT_FOUND')) {
        ResponseUtil.error(res, 'Customer not found for message', 'NOT_FOUND', undefined, 404);
        return;
      }
      if (message === 'INSUFFICIENT_CUSTOMER_EVIDENCE') {
        ResponseUtil.error(res, 'Insufficient customer profile evidence to execute compliance validation', 'INSUFFICIENT_DATA', undefined, 422);
        return;
      }
      ResponseUtil.error(res, message, 'COMPLIANCE_VALIDATION_ERROR', undefined, 500);
    }
  }

  /**
   * Retrieves the latest compliance report for a message.
   */
  static async getLatest(req: Request, res: Response): Promise<void> {
    try {
      const messageId = req.params.messageId as string;
      const report = await ComplianceService.getLatestReport(messageId);
      if (!report) {
        ResponseUtil.error(res, 'No compliance validation report found for this message', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.success(res, 'Latest compliance report retrieved successfully', report, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve compliance report';
      if (message === 'INVALID_MESSAGE_ID') {
        ResponseUtil.error(res, 'Invalid message ID', 'INVALID_PARAMS', undefined, 400);
        return;
      }
      ResponseUtil.error(res, message, 'COMPLIANCE_RETRIEVE_ERROR', undefined, 500);
    }
  }

  /**
   * Retrieves validation history for a message.
   */
  static async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const messageId = req.params.messageId as string;
      const pagination = getPaginationParams(req.query as Record<string, unknown>, 'validatedAt', -1);
      const result = await ComplianceService.getValidationHistory(messageId, pagination);
      ResponseUtil.success(
        res,
        'Compliance validation history retrieved successfully',
        result.reports,
        result.meta as unknown as Record<string, unknown>,
        200
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve validation history';
      if (message === 'INVALID_MESSAGE_ID') {
        ResponseUtil.error(res, 'Invalid message ID', 'INVALID_PARAMS', undefined, 400);
        return;
      }
      ResponseUtil.error(res, message, 'COMPLIANCE_HISTORY_ERROR', undefined, 500);
    }
  }

  /**
   * Retrieves a single validation report by its reportId.
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const reportId = req.params.reportId as string;
      const report = await ComplianceService.getReportById(reportId);
      ResponseUtil.success(res, 'Compliance validation report retrieved successfully', report, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve compliance report';
      if (message === 'COMPLIANCE_REPORT_NOT_FOUND' || message === 'INVALID_REPORT_ID') {
        ResponseUtil.error(res, 'Compliance validation report not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'COMPLIANCE_REPORT_GET_ERROR', undefined, 500);
    }
  }

  /**
   * Validates all drafts for a customer in a batch.
   */
  static async validateCustomerDrafts(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.params.customerId as string;
      const pagination = getPaginationParams(req.query as Record<string, unknown>, 'generatedAt', -1);
      const result = await ComplianceService.validateCustomerDrafts(customerId, pagination);
      ResponseUtil.success(
        res,
        'Customer drafts compliance validation completed',
        result.results,
        result.meta as unknown as Record<string, unknown>,
        200
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to validate customer drafts';
      if (message === 'CUSTOMER_NOT_FOUND') {
        ResponseUtil.error(res, 'Customer not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'CUSTOMER_DRAFTS_VALIDATION_ERROR', undefined, 500);
    }
  }

  /**
   * Retrieves active compliance policy configuration.
   */
  static async getConfig(_req: Request, res: Response): Promise<void> {
    try {
      const config = await ComplianceService.getActiveConfig();
      ResponseUtil.success(res, 'Active compliance policy configuration retrieved', config, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve compliance config';
      ResponseUtil.error(res, message, 'COMPLIANCE_CONFIG_ERROR', undefined, 500);
    }
  }

  /**
   * Updates compliance policy configuration.
   */
  static async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const updatedBy = req.user?.email || req.user?.id || 'ADMIN';
      const updated = await ComplianceService.updateConfig(req.body, updatedBy);
      ResponseUtil.success(res, 'Compliance policy configuration updated successfully', updated, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update compliance config';
      ResponseUtil.error(res, message, 'COMPLIANCE_CONFIG_UPDATE_ERROR', undefined, 500);
    }
  }

  /**
   * Retrieves platform-wide compliance statistics.
   */
  static async getStatistics(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await ComplianceService.getStatistics();
      ResponseUtil.success(res, 'Compliance validation statistics retrieved successfully', stats, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve compliance statistics';
      ResponseUtil.error(res, message, 'COMPLIANCE_STATS_ERROR', undefined, 500);
    }
  }

  /**
   * Retrieves blocked messages with pagination and optional customer/reason filters.
   */
  static async getBlockedMessages(req: Request, res: Response): Promise<void> {
    try {
      const pagination = getPaginationParams(req.query as Record<string, unknown>, 'validatedAt', -1);
      const filters = {
        customerId: req.query.customerId ? String(req.query.customerId) : undefined,
        reasonCode: req.query.reasonCode ? String(req.query.reasonCode) : undefined
      };

      const result = await ComplianceService.getBlockedMessages(pagination, filters);
      ResponseUtil.success(
        res,
        'Blocked compliance messages retrieved successfully',
        result.reports,
        result.meta as unknown as Record<string, unknown>,
        200
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve blocked messages';
      ResponseUtil.error(res, message, 'BLOCKED_MESSAGES_ERROR', undefined, 500);
    }
  }
}

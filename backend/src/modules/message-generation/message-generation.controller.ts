import { Request, Response } from 'express';
import { MessageGenerationService } from './message-generation.service.js';
import { ResponseUtil } from '../../utils/apiResponse.js';
import { getPaginationParams } from '../../utils/pagination.js';

export class MessageGenerationController {
  static async generate(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.params.customerId as string;
      const { channel, provider, model } = req.body;

      const draft = await MessageGenerationService.generateDraft(customerId, {
        channel,
        provider,
        modelOverride: model
      });

      ResponseUtil.success(res, 'Message draft generated successfully', draft, undefined, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate message draft';
      if (message.includes('CUSTOMER_NOT_FOUND')) {
        ResponseUtil.error(res, 'Customer not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'MESSAGE_GENERATION_ERROR', undefined, 500);
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const messageId = req.params.messageId as string;
      const message = await MessageGenerationService.getDraftById(messageId);
      ResponseUtil.success(res, 'Generated message retrieved successfully', message, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve message draft';
      if (message === 'MESSAGE_DRAFT_NOT_FOUND' || message === 'INVALID_MESSAGE_ID') {
        ResponseUtil.error(res, 'Message draft not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'MESSAGE_GET_ERROR', undefined, 500);
    }
  }

  static async listByCustomer(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.params.customerId as string;
      const pagination = getPaginationParams(req.query as Record<string, unknown>, 'generatedAt', -1);

      const result = await MessageGenerationService.listCustomerDrafts(customerId, pagination);
      ResponseUtil.success(
        res,
        'Customer message drafts retrieved successfully',
        result.messages,
        result.meta as unknown as Record<string, unknown>,
        200
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list customer message drafts';
      ResponseUtil.error(res, message, 'MESSAGE_LIST_ERROR', undefined, 500);
    }
  }

  static async regenerate(req: Request, res: Response): Promise<void> {
    try {
      const messageId = req.params.messageId as string;
      const { reason, provider, model } = req.body;

      const newDraft = await MessageGenerationService.regenerateDraft(messageId, {
        reason,
        provider,
        modelOverride: model
      });

      ResponseUtil.success(res, 'Message regenerated successfully as a new draft', newDraft, undefined, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to regenerate message draft';
      if (message === 'MESSAGE_DRAFT_NOT_FOUND' || message === 'INVALID_MESSAGE_ID') {
        ResponseUtil.error(res, 'Previous message draft not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'MESSAGE_REGENERATE_ERROR', undefined, 500);
    }
  }

  static async previewContext(req: Request, res: Response): Promise<void> {
    try {
      const customerId = req.params.customerId as string;
      const channel = (req.query.channel as string) || 'EMAIL';

      const preview = await MessageGenerationService.previewContext(customerId, channel);
      ResponseUtil.success(res, 'Message generation context preview generated', preview, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to preview generation context';
      if (message.includes('CUSTOMER_NOT_FOUND')) {
        ResponseUtil.error(res, 'Customer not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'CONTEXT_PREVIEW_ERROR', undefined, 500);
    }
  }

  static getConfig(_req: Request, res: Response): void {
    try {
      const config = MessageGenerationService.getConfig();
      ResponseUtil.success(res, 'Message generation configuration retrieved', config, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get config';
      ResponseUtil.error(res, message, 'CONFIG_GET_ERROR', undefined, 500);
    }
  }

  static updateConfig(req: Request, res: Response): void {
    try {
      const updatedBy = req.user?.email || 'ADMIN';
      const updated = MessageGenerationService.updateConfig(req.body, updatedBy);
      ResponseUtil.success(res, 'Message generation configuration updated', updated, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update config';
      ResponseUtil.error(res, message, 'CONFIG_UPDATE_ERROR', undefined, 500);
    }
  }
}

import { Request, Response } from 'express';
import { CampaignsService } from './campaigns.service.js';
import { CampaignStatus, CampaignObjective } from './campaigns.types.js';
import { CustomerSegmentType } from '../segmentation/segmentation.constants.js';
import { ResponseUtil } from '../../utils/apiResponse.js';
import { getPaginationParams } from '../../utils/pagination.js';

export class CampaignsController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const campaign = await CampaignsService.createCampaign(req.body);
      ResponseUtil.success(res, 'Campaign created successfully', campaign, undefined, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create campaign';
      if (message === 'CAMPAIGN_CODE_ALREADY_EXISTS') {
        ResponseUtil.error(res, 'Campaign code already exists', 'CONFLICT', undefined, 409);
        return;
      }
      ResponseUtil.error(res, message, 'CAMPAIGN_CREATE_ERROR', undefined, 500);
    }
  }

  static async list(req: Request, res: Response): Promise<void> {
    try {
      const pagination = getPaginationParams(req.query as Record<string, unknown>, 'createdAt', -1);
      const filters = {
        status: req.query.status as CampaignStatus | undefined,
        objective: req.query.objective as CampaignObjective | undefined,
        targetSegment: req.query.targetSegment as CustomerSegmentType | undefined,
        search: req.query.search as string | undefined
      };

      const result = await CampaignsService.listCampaigns(pagination, filters);
      ResponseUtil.success(
        res,
        'Campaigns retrieved successfully',
        result.campaigns,
        result.meta as unknown as Record<string, unknown>,
        200
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list campaigns';
      ResponseUtil.error(res, message, 'CAMPAIGN_LIST_ERROR', undefined, 500);
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const campaignId = req.params.campaignId as string;
      const campaign = await CampaignsService.getCampaign(campaignId);
      ResponseUtil.success(res, 'Campaign retrieved successfully', campaign, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve campaign';
      if (message === 'CAMPAIGN_NOT_FOUND') {
        ResponseUtil.error(res, 'Campaign record not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'CAMPAIGN_GET_ERROR', undefined, 500);
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const campaignId = req.params.campaignId as string;
      const campaign = await CampaignsService.updateCampaign(campaignId, req.body);
      ResponseUtil.success(res, 'Campaign updated successfully', campaign, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update campaign';
      if (message === 'CAMPAIGN_NOT_FOUND') {
        ResponseUtil.error(res, 'Campaign record not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'CAMPAIGN_UPDATE_ERROR', undefined, 500);
    }
  }

  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const campaignId = req.params.campaignId as string;
      const { status } = req.body;
      const campaign = await CampaignsService.updateStatus(campaignId, status);
      ResponseUtil.success(res, `Campaign status updated to ${status}`, campaign, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      if (message === 'CAMPAIGN_NOT_FOUND') {
        ResponseUtil.error(res, 'Campaign record not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'CAMPAIGN_STATUS_ERROR', undefined, 500);
    }
  }

  static async attachOffer(req: Request, res: Response): Promise<void> {
    try {
      const campaignId = req.params.campaignId as string;
      const { offerId } = req.body;
      const campaign = await CampaignsService.attachOffer(campaignId, offerId);
      ResponseUtil.success(res, 'Offer attached to campaign successfully', campaign, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to attach offer';
      if (message === 'CAMPAIGN_NOT_FOUND') {
        ResponseUtil.error(res, 'Campaign record not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'ATTACH_OFFER_ERROR', undefined, 500);
    }
  }

  static async detachOffer(req: Request, res: Response): Promise<void> {
    try {
      const campaignId = req.params.campaignId as string;
      const offerId = req.params.offerId as string;
      const campaign = await CampaignsService.detachOffer(campaignId, offerId);
      ResponseUtil.success(res, 'Offer detached from campaign successfully', campaign, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to detach offer';
      if (message === 'CAMPAIGN_NOT_FOUND') {
        ResponseUtil.error(res, 'Campaign record not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'DETACH_OFFER_ERROR', undefined, 500);
    }
  }
}

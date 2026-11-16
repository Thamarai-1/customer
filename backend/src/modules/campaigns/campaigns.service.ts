import { Types } from 'mongoose';
import { CampaignModel, ICampaignDocument } from './campaigns.model.js';
import {
  CreateCampaignDTO,
  UpdateCampaignDTO,
  CampaignStatus,
  CampaignFilterQuery
} from './campaigns.types.js';
import { CustomerSegmentType } from '../segmentation/segmentation.constants.js';
import { PaginationQueryOptions, getPaginationMeta } from '../../utils/pagination.js';
import { PaginationMeta } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

export class CampaignsService {
  /**
   * Helper to resolve campaign by ObjectId or campaignCode
   */
  static async findByIdOrCode(identifier: string): Promise<ICampaignDocument | null> {
    const isObjectId = Types.ObjectId.isValid(identifier);
    if (isObjectId) {
      const byId = await CampaignModel.findById(identifier);
      if (byId) return byId;
    }
    return CampaignModel.findOne({ campaignCode: identifier.trim().toUpperCase() });
  }

  /**
   * Create a new campaign
   */
  static async createCampaign(data: CreateCampaignDTO): Promise<ICampaignDocument> {
    const existing = await CampaignModel.findOne({
      campaignCode: data.campaignCode.trim().toUpperCase()
    });
    if (existing) {
      throw new Error('CAMPAIGN_CODE_ALREADY_EXISTS');
    }

    const campaign = await CampaignModel.create({
      ...data,
      campaignCode: data.campaignCode.trim().toUpperCase(),
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      offerIds: data.offerIds ? data.offerIds.map((id) => new Types.ObjectId(id)) : []
    });

    logger.info(`Campaign created: ${campaign.campaignCode} (${campaign.name})`, 'CampaignsService');
    return campaign;
  }

  /**
   * Update campaign details
   */
  static async updateCampaign(
    campaignIdOrCode: string,
    data: UpdateCampaignDTO
  ): Promise<ICampaignDocument> {
    const campaign = await this.findByIdOrCode(campaignIdOrCode);
    if (!campaign) {
      throw new Error('CAMPAIGN_NOT_FOUND');
    }

    if (data.name !== undefined) campaign.name = data.name;
    if (data.description !== undefined) campaign.description = data.description;
    if (data.objective !== undefined) campaign.objective = data.objective;
    if (data.targetSegments !== undefined) campaign.targetSegments = data.targetSegments;
    if (data.status !== undefined) campaign.status = data.status;
    if (data.startDate !== undefined) campaign.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) campaign.endDate = new Date(data.endDate);
    if (data.allowedChannels !== undefined) campaign.allowedChannels = data.allowedChannels;
    if (data.priority !== undefined) campaign.priority = data.priority;
    if (data.toneGuideline !== undefined) campaign.toneGuideline = data.toneGuideline;
    if (data.mandatoryDisclaimers !== undefined) campaign.mandatoryDisclaimers = data.mandatoryDisclaimers;
    if (data.blockedKeywords !== undefined) campaign.blockedKeywords = data.blockedKeywords;
    if (data.budgetTotal !== undefined) campaign.budgetTotal = data.budgetTotal;

    await campaign.save();
    return campaign;
  }

  /**
   * Update campaign status
   */
  static async updateStatus(
    campaignIdOrCode: string,
    status: CampaignStatus
  ): Promise<ICampaignDocument> {
    const campaign = await this.findByIdOrCode(campaignIdOrCode);
    if (!campaign) {
      throw new Error('CAMPAIGN_NOT_FOUND');
    }

    campaign.status = status;
    await campaign.save();
    logger.info(`Campaign ${campaign.campaignCode} status updated to ${status}`, 'CampaignsService');
    return campaign;
  }

  /**
   * Retrieve campaign by ID or code, populating attached offers
   */
  static async getCampaign(campaignIdOrCode: string): Promise<ICampaignDocument> {
    const isObjectId = Types.ObjectId.isValid(campaignIdOrCode);
    let campaign: ICampaignDocument | null = null;

    if (isObjectId) {
      campaign = await CampaignModel.findById(campaignIdOrCode).populate('offerIds');
    }
    if (!campaign) {
      campaign = await CampaignModel.findOne({
        campaignCode: campaignIdOrCode.trim().toUpperCase()
      }).populate('offerIds');
    }

    if (!campaign) {
      throw new Error('CAMPAIGN_NOT_FOUND');
    }

    return campaign;
  }

  /**
   * List campaigns with pagination and filters
   */
  static async listCampaigns(
    pagination: PaginationQueryOptions,
    filters: CampaignFilterQuery = {}
  ): Promise<{ campaigns: ICampaignDocument[]; meta: PaginationMeta }> {
    const query: Record<string, unknown> = {};

    if (filters.status) query.status = filters.status;
    if (filters.objective) query.objective = filters.objective;
    if (filters.targetSegment) query.targetSegments = filters.targetSegment;

    if (filters.search) {
      const searchRegex = new RegExp(filters.search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { campaignCode: searchRegex }, { description: searchRegex }];
    }

    const [campaigns, total] = await Promise.all([
      CampaignModel.find(query)
        .populate('offerIds')
        .sort({ [pagination.sortBy]: pagination.sortOrder })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      CampaignModel.countDocuments(query)
    ]);

    const meta = getPaginationMeta(total, pagination.page, pagination.limit);
    return { campaigns: campaigns as unknown as ICampaignDocument[], meta };
  }

  /**
   * Attach an offer to a campaign
   */
  static async attachOffer(
    campaignIdOrCode: string,
    offerId: string
  ): Promise<ICampaignDocument> {
    const campaign = await this.findByIdOrCode(campaignIdOrCode);
    if (!campaign) {
      throw new Error('CAMPAIGN_NOT_FOUND');
    }

    const objId = new Types.ObjectId(offerId);
    const alreadyAttached = campaign.offerIds.some((id) => id.toString() === objId.toString());

    if (!alreadyAttached) {
      campaign.offerIds.push(objId);
      await campaign.save();
    }

    return campaign;
  }

  /**
   * Detach an offer from a campaign
   */
  static async detachOffer(
    campaignIdOrCode: string,
    offerId: string
  ): Promise<ICampaignDocument> {
    const campaign = await this.findByIdOrCode(campaignIdOrCode);
    if (!campaign) {
      throw new Error('CAMPAIGN_NOT_FOUND');
    }

    campaign.offerIds = campaign.offerIds.filter(
      (id) => id.toString() !== offerId.toString()
    );
    await campaign.save();

    return campaign;
  }

  /**
   * Deterministically find active, valid campaigns for a target customer segment
   */
  static async findActiveCampaignsForSegment(
    segment: CustomerSegmentType,
    evaluationDate: Date = new Date()
  ): Promise<ICampaignDocument[]> {
    const campaigns = await CampaignModel.find({
      status: CampaignStatus.ACTIVE,
      targetSegments: segment,
      startDate: { $lte: evaluationDate },
      endDate: { $gte: evaluationDate }
    })
      .populate('offerIds')
      .sort({ priority: 1, createdAt: -1 })
      .lean();

    return campaigns as unknown as ICampaignDocument[];
  }
}

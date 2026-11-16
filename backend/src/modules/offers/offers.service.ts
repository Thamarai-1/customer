import { Types } from 'mongoose';
import { OfferModel, IOfferDocument } from './offers.model.js';
import {
  CreateOfferDTO,
  UpdateOfferDTO,
  OfferStatus,
  OfferFilterQuery,
  OfferEligibilityResult
} from './offers.types.js';
import { OfferEligibilityService } from './offer-eligibility.service.js';
import { CustomerProfileService } from '../customers/customer-profile.service.js';
import { SegmentationService } from '../segmentation/segmentation.service.js';
import { PaginationQueryOptions, getPaginationMeta } from '../../utils/pagination.js';
import { PaginationMeta } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

export class OffersService {
  /**
   * Helper to resolve offer by ObjectId or offerCode
   */
  static async findByIdOrCode(identifier: string): Promise<IOfferDocument | null> {
    const isObjectId = Types.ObjectId.isValid(identifier);
    if (isObjectId) {
      const byId = await OfferModel.findById(identifier);
      if (byId) return byId;
    }
    return OfferModel.findOne({ offerCode: identifier.trim().toUpperCase() });
  }

  /**
   * Create a new offer
   */
  static async createOffer(data: CreateOfferDTO): Promise<IOfferDocument> {
    const existing = await OfferModel.findOne({
      offerCode: data.offerCode.trim().toUpperCase()
    });
    if (existing) {
      throw new Error('OFFER_CODE_ALREADY_EXISTS');
    }

    const offer = await OfferModel.create({
      ...data,
      offerCode: data.offerCode.trim().toUpperCase(),
      validFrom: new Date(data.validFrom),
      validUntil: new Date(data.validUntil)
    });

    logger.info(`Offer created: ${offer.offerCode} (${offer.name})`, 'OffersService');
    return offer;
  }

  /**
   * Update offer details
   */
  static async updateOffer(
    offerIdOrCode: string,
    data: UpdateOfferDTO
  ): Promise<IOfferDocument> {
    const offer = await this.findByIdOrCode(offerIdOrCode);
    if (!offer) {
      throw new Error('OFFER_NOT_FOUND');
    }

    if (data.name !== undefined) offer.name = data.name;
    if (data.description !== undefined) offer.description = data.description;
    if (data.offerType !== undefined) offer.offerType = data.offerType;
    if (data.value !== undefined) offer.value = data.value;
    if (data.valueType !== undefined) offer.valueType = data.valueType;
    if (data.currency !== undefined) offer.currency = data.currency;
    if (data.targetSegments !== undefined) offer.targetSegments = data.targetSegments;
    if (data.eligibilityRules !== undefined) {
      offer.eligibilityRules = { ...offer.eligibilityRules, ...data.eligibilityRules };
    }
    if (data.validFrom !== undefined) offer.validFrom = new Date(data.validFrom);
    if (data.validUntil !== undefined) offer.validUntil = new Date(data.validUntil);
    if (data.allowedChannels !== undefined) offer.allowedChannels = data.allowedChannels;
    if (data.termsAndConditions !== undefined) offer.termsAndConditions = data.termsAndConditions;
    if (data.status !== undefined) offer.status = data.status;
    if (data.maxRedemptions !== undefined) offer.maxRedemptions = data.maxRedemptions;

    await offer.save();
    return offer;
  }

  /**
   * Update offer status
   */
  static async updateStatus(
    offerIdOrCode: string,
    status: OfferStatus
  ): Promise<IOfferDocument> {
    const offer = await this.findByIdOrCode(offerIdOrCode);
    if (!offer) {
      throw new Error('OFFER_NOT_FOUND');
    }

    offer.status = status;
    await offer.save();
    logger.info(`Offer ${offer.offerCode} status updated to ${status}`, 'OffersService');
    return offer;
  }

  /**
   * Retrieve offer by ID or code
   */
  static async getOffer(offerIdOrCode: string): Promise<IOfferDocument> {
    const offer = await this.findByIdOrCode(offerIdOrCode);
    if (!offer) {
      throw new Error('OFFER_NOT_FOUND');
    }
    return offer;
  }

  /**
   * List offers with pagination and filters
   */
  static async listOffers(
    pagination: PaginationQueryOptions,
    filters: OfferFilterQuery = {}
  ): Promise<{ offers: IOfferDocument[]; meta: PaginationMeta }> {
    const query: Record<string, unknown> = {};

    if (filters.status) query.status = filters.status;
    if (filters.offerType) query.offerType = filters.offerType;
    if (filters.targetSegment) query.targetSegments = filters.targetSegment;

    if (filters.search) {
      const searchRegex = new RegExp(filters.search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { offerCode: searchRegex }, { description: searchRegex }];
    }

    const [offers, total] = await Promise.all([
      OfferModel.find(query)
        .sort({ [pagination.sortBy]: pagination.sortOrder })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      OfferModel.countDocuments(query)
    ]);

    const meta = getPaginationMeta(total, pagination.page, pagination.limit);
    return { offers: offers as unknown as IOfferDocument[], meta };
  }

  /**
   * Evaluate a customer's eligibility for an offer deterministically
   */
  static async evaluateCustomerEligibility(
    offerIdOrCode: string,
    customerIdOrId: string,
    requestedChannel = 'EMAIL'
  ): Promise<OfferEligibilityResult> {
    const offer = await this.findByIdOrCode(offerIdOrCode);
    if (!offer) {
      throw new Error('OFFER_NOT_FOUND');
    }

    const [profile, classification] = await Promise.all([
      CustomerProfileService.assembleProfile(customerIdOrId),
      SegmentationService.getCustomerClassification(customerIdOrId).catch(() => null)
    ]);

    return OfferEligibilityService.evaluate(
      offer,
      profile,
      classification,
      requestedChannel,
      new Date()
    );
  }
}

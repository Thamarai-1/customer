import { Request, Response } from 'express';
import { OffersService } from './offers.service.js';
import { OfferType, OfferStatus } from './offers.types.js';
import { CustomerSegmentType } from '../segmentation/segmentation.constants.js';
import { ResponseUtil } from '../../utils/apiResponse.js';
import { getPaginationParams } from '../../utils/pagination.js';

export class OffersController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const offer = await OffersService.createOffer(req.body);
      ResponseUtil.success(res, 'Offer created successfully', offer, undefined, 201);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create offer';
      if (message === 'OFFER_CODE_ALREADY_EXISTS') {
        ResponseUtil.error(res, 'Offer code already exists', 'CONFLICT', undefined, 409);
        return;
      }
      ResponseUtil.error(res, message, 'OFFER_CREATE_ERROR', undefined, 500);
    }
  }

  static async list(req: Request, res: Response): Promise<void> {
    try {
      const pagination = getPaginationParams(req.query as Record<string, unknown>, 'createdAt', -1);
      const filters = {
        status: req.query.status as OfferStatus | undefined,
        offerType: req.query.offerType as OfferType | undefined,
        targetSegment: req.query.targetSegment as CustomerSegmentType | undefined,
        search: req.query.search as string | undefined
      };

      const result = await OffersService.listOffers(pagination, filters);
      ResponseUtil.success(
        res,
        'Offers retrieved successfully',
        result.offers,
        result.meta as unknown as Record<string, unknown>,
        200
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list offers';
      ResponseUtil.error(res, message, 'OFFER_LIST_ERROR', undefined, 500);
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const offerId = req.params.offerId as string;
      const offer = await OffersService.getOffer(offerId);
      ResponseUtil.success(res, 'Offer retrieved successfully', offer, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve offer';
      if (message === 'OFFER_NOT_FOUND') {
        ResponseUtil.error(res, 'Offer record not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'OFFER_GET_ERROR', undefined, 500);
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const offerId = req.params.offerId as string;
      const offer = await OffersService.updateOffer(offerId, req.body);
      ResponseUtil.success(res, 'Offer updated successfully', offer, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update offer';
      if (message === 'OFFER_NOT_FOUND') {
        ResponseUtil.error(res, 'Offer record not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'OFFER_UPDATE_ERROR', undefined, 500);
    }
  }

  static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const offerId = req.params.offerId as string;
      const { status } = req.body;
      const offer = await OffersService.updateStatus(offerId, status);
      ResponseUtil.success(res, `Offer status updated to ${status}`, offer, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update offer status';
      if (message === 'OFFER_NOT_FOUND') {
        ResponseUtil.error(res, 'Offer record not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'OFFER_STATUS_ERROR', undefined, 500);
    }
  }

  static async evaluateCustomer(req: Request, res: Response): Promise<void> {
    try {
      const offerId = req.params.offerId as string;
      const customerId = req.params.customerId as string;
      const channel = (req.query.channel as string) || 'EMAIL';

      const evaluation = await OffersService.evaluateCustomerEligibility(offerId, customerId, channel);
      ResponseUtil.success(res, 'Offer eligibility evaluated successfully', evaluation, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to evaluate offer eligibility';
      if (message === 'OFFER_NOT_FOUND' || message === 'CUSTOMER_NOT_FOUND') {
        ResponseUtil.error(res, message === 'OFFER_NOT_FOUND' ? 'Offer not found' : 'Customer not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'EVALUATION_ERROR', undefined, 500);
    }
  }
}

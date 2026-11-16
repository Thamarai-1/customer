import { CustomerSegmentType } from '../segmentation/segmentation.constants.js';

export enum OfferType {
  PERCENTAGE_DISCOUNT = 'PERCENTAGE_DISCOUNT',
  FIXED_DISCOUNT = 'FIXED_DISCOUNT',
  LOYALTY_POINTS = 'LOYALTY_POINTS',
  PLAN_UPGRADE = 'PLAN_UPGRADE',
  PROMOTIONAL_CREDIT = 'PROMOTIONAL_CREDIT',
  CUSTOM_REWARD = 'CUSTOM_REWARD'
}

export enum OfferStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  EXPIRED = 'EXPIRED',
  ARCHIVED = 'ARCHIVED'
}

export enum OfferValueType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  POINTS = 'POINTS',
  UPGRADE_TIER = 'UPGRADE_TIER',
  CREDIT = 'CREDIT'
}

export interface IOfferEligibilityRules {
  minimumLoyaltyPoints?: number;
  minimumMembershipDays?: number;
  requiredLoyaltyTiers?: string[];
  requiredAccountStatus?: string;
  requiredPlanStatus?: string;
  requiredPlanType?: string;
  maxOverdueBalance?: number;
  maxDaysOverdue?: number;
}

export interface CreateOfferDTO {
  offerCode: string;
  name: string;
  description: string;
  offerType: OfferType;
  value: number;
  valueType?: OfferValueType;
  currency?: string | null;
  targetSegments: CustomerSegmentType[];
  eligibilityRules?: IOfferEligibilityRules;
  validFrom: Date | string;
  validUntil: Date | string;
  allowedChannels?: string[];
  termsAndConditions?: string[];
  status?: OfferStatus;
  maxRedemptions?: number;
}

export interface UpdateOfferDTO {
  name?: string;
  description?: string;
  offerType?: OfferType;
  value?: number;
  valueType?: OfferValueType;
  currency?: string | null;
  targetSegments?: CustomerSegmentType[];
  eligibilityRules?: IOfferEligibilityRules;
  validFrom?: Date | string;
  validUntil?: Date | string;
  allowedChannels?: string[];
  termsAndConditions?: string[];
  status?: OfferStatus;
  maxRedemptions?: number;
}

export interface OfferFilterQuery {
  status?: OfferStatus;
  offerType?: OfferType;
  targetSegment?: CustomerSegmentType;
  search?: string;
}

export interface FailedEligibilityCondition {
  rule: string;
  required: unknown;
  actual: unknown;
  reason: string;
}

export interface OfferEligibilityResult {
  customerId: string;
  offerId: string;
  offerCode: string;
  eligible: boolean;
  status: 'ELIGIBLE' | 'INELIGIBLE' | 'INSUFFICIENT_DATA';
  reasonCodes: string[];
  passedConditions: string[];
  failedConditions: FailedEligibilityCondition[];
  validatedAt: Date;
}

import { CustomerSegmentType } from '../segmentation/segmentation.constants.js';

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  EXPIRED = 'EXPIRED',
  ARCHIVED = 'ARCHIVED'
}

export enum CampaignObjective {
  CUSTOMER_APPRECIATION = 'CUSTOMER_APPRECIATION',
  LOYALTY_REWARD = 'LOYALTY_REWARD',
  CUSTOMER_ENGAGEMENT = 'CUSTOMER_ENGAGEMENT',
  RE_ENGAGEMENT = 'RE_ENGAGEMENT',
  CUSTOMER_RETENTION = 'CUSTOMER_RETENTION',
  SUBSCRIPTION_RENEWAL = 'SUBSCRIPTION_RENEWAL',
  PAYMENT_FOLLOW_UP = 'PAYMENT_FOLLOW_UP'
}

export interface CreateCampaignDTO {
  campaignCode: string;
  name: string;
  description: string;
  objective: CampaignObjective;
  targetSegments: CustomerSegmentType[];
  status?: CampaignStatus;
  startDate: Date | string;
  endDate: Date | string;
  allowedChannels?: string[];
  offerIds?: string[];
  priority?: number;
  toneGuideline?: string;
  mandatoryDisclaimers?: string[];
  blockedKeywords?: string[];
  budgetTotal?: number;
}

export interface UpdateCampaignDTO {
  name?: string;
  description?: string;
  objective?: CampaignObjective;
  targetSegments?: CustomerSegmentType[];
  status?: CampaignStatus;
  startDate?: Date | string;
  endDate?: Date | string;
  allowedChannels?: string[];
  priority?: number;
  toneGuideline?: string;
  mandatoryDisclaimers?: string[];
  blockedKeywords?: string[];
  budgetTotal?: number;
}

export interface CampaignFilterQuery {
  status?: CampaignStatus;
  objective?: CampaignObjective;
  targetSegment?: CustomerSegmentType;
  search?: string;
}

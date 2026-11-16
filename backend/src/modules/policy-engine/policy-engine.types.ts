import { CustomerSegmentType } from '../segmentation/segmentation.constants.js';
import { StrategyObjective, CommunicationTone } from '../strategies/strategies.types.js';
import { ReminderStage, IBillingReminderEvaluation } from '../billing-policies/billing-policies.types.js';
import { OfferEligibilityResult } from '../offers/offers.types.js';

export interface IPolicyCustomerSummary {
  customerId: string;
  fullName: string;
  email: string;
  accountStatus: string;
  loyaltyTier: string;
  loyaltyPoints: number;
  activePlan: string;
  planStatus: string;
  membershipDays: number;
}

export interface IPolicyStrategyDecision {
  primarySegment: CustomerSegmentType;
  secondarySegments: CustomerSegmentType[];
  primaryObjective: StrategyObjective;
  recommendedTone: CommunicationTone;
  alternativeTones: CommunicationTone[];
  recommendedActions: string[];
  priorityLevel: number;
  suppressPromotions: boolean;
  reasoning: string[];
}

export interface IPolicyChannelConsent {
  preferredChannel: string;
  optedOut: boolean;
  emailConsent: boolean;
  smsConsent: boolean;
  whatsappConsent: boolean;
  isEligibleForOutreach: boolean;
  outreachWarning?: string;
}

export interface IPolicyRecommendation {
  primaryAction: string;
  recommendedCampaignId?: string;
  recommendedCampaignName?: string;
  primaryOfferCode?: string;
  primaryOfferName?: string;
  billingReminderStage: ReminderStage;
  requiresHumanReview: boolean;
  communicationTone: CommunicationTone;
  targetObjective: StrategyObjective;
  messageGenerationContext: {
    customerSegment: CustomerSegmentType;
    objective: StrategyObjective;
    tone: CommunicationTone;
    offerDetails?: {
      code: string;
      name: string;
      value: number;
      valueType: string;
      terms: string[];
    };
    billingDetails?: {
      stage: ReminderStage;
      totalOverdueByCurrency: Record<string, number>;
      requiresHumanReview: boolean;
    };
  };
}

export interface IPolicyEvaluationReport {
  evaluationId?: string;
  customerId: string;
  evaluatedAt: Date;
  customerSummary: IPolicyCustomerSummary;
  strategy: IPolicyStrategyDecision;
  campaigns: {
    matchedActiveCampaigns: Array<{
      campaignId: string;
      campaignCode: string;
      name: string;
      objective: string;
      targetSegments: string[];
      validUntil: Date;
    }>;
  };
  offers: {
    eligibleOffers: OfferEligibilityResult[];
    ineligibleOffers: OfferEligibilityResult[];
  };
  billing: IBillingReminderEvaluation;
  channelConsent: IPolicyChannelConsent;
  recommendation: IPolicyRecommendation;
}

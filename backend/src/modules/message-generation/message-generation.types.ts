import { Types, HydratedDocument } from 'mongoose';
import { CustomerSegmentType } from '../segmentation/segmentation.constants.js';
import { StrategyObjective, CommunicationTone } from '../strategies/strategies.types.js';
import { ReminderStage } from '../billing-policies/billing-policies.types.js';
import { MessageGenerationStatus, GroundingStatus } from './message-generation.constants.js';
import { TokenUsage, AIProviderType } from '../ai/ai-provider.types.js';

export interface IGenerationNotes {
  usedCustomerName?: boolean;
  usedApprovedOffer?: boolean;
  usedBillingInformation?: boolean;
}

export interface IGeneratedEmailStructured {
  subject: string;
  body: string;
  objective: string;
  tone: string[] | string;
  referencedOffers: string[];
  referencedBillingFacts: string[];
  generationNotes?: IGenerationNotes;
}

export interface IEvidenceContext {
  customer: {
    firstName: string;
    activePlan: string;
    loyaltyTier: string;
    loyaltyPoints: number;
    membershipDurationDays: number;
  };
  classification: {
    primarySegment: CustomerSegmentType;
    segments: CustomerSegmentType[];
    reasonCodes: string[];
  };
  policyDecision: {
    objective: StrategyObjective;
    tone: CommunicationTone;
    alternativeTones: CommunicationTone[];
    recommendedActions: string[];
    suppressPromotions: boolean;
  };
  campaign?: {
    campaignCode: string;
    name: string;
    description: string;
    mandatoryDisclaimers: string[];
    blockedKeywords: string[];
  };
  eligibleOffers: Array<{
    offerCode: string;
    name: string;
    offerType: string;
    value: number;
    valueType: string;
    currency: string | null;
    termsAndConditions: string[];
    validUntil?: string;
  }>;
  billing?: {
    reminderStage: ReminderStage;
    totalOverdueByCurrency: Record<string, number>;
    totalOutstandingByCurrency: Record<string, number>;
    primaryCurrency: string;
    dueDates: string[];
    hasDispute: boolean;
    requiresHumanReview: boolean;
  };
  communication: {
    channel: string;
    consentGranted: boolean;
  };
}

export interface IGroundingFinding {
  rule: string;
  severity: 'ERROR' | 'WARNING';
  message: string;
  evidenceValue?: string;
  generatedValue?: string;
}

export interface GroundingValidationResult {
  status: GroundingStatus;
  isGrounded: boolean;
  findings: IGroundingFinding[];
  validatedAt: Date;
}

export interface IGeneratedMessage {
  customerId: string;
  customerRef: Types.ObjectId;
  policyEvaluationId?: Types.ObjectId;
  campaignRef?: Types.ObjectId;
  primarySegment: CustomerSegmentType;
  objective: string;
  channel: string;
  subject: string;
  body: string;
  referencedOffers: string[];
  referencedBillingFacts: string[];
  generationStatus: MessageGenerationStatus;
  groundingStatus: GroundingStatus;
  validationFindings: IGroundingFinding[];
  provider: AIProviderType | string;
  model: string;
  promptVersion: string;
  tokenUsage?: TokenUsage;
  latencyMs: number;
  retryCount: number;
  evidenceSnapshot: IEvidenceContext;
  refusalReason?: string;
  generatedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IGeneratedMessageDocument = HydratedDocument<IGeneratedMessage>;

export interface GenerateDraftOptions {
  channel?: string;
  provider?: AIProviderType;
  modelOverride?: string;
}

export interface RegenerateDraftOptions {
  reason?: string;
  provider?: AIProviderType;
  modelOverride?: string;
}

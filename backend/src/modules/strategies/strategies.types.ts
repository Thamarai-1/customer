import { CustomerSegmentType } from '../segmentation/segmentation.constants.js';

export enum StrategyObjective {
  RELATIONSHIP_NURTURE = 'RELATIONSHIP_NURTURE',
  LOYALTY_RECOGNITION = 'LOYALTY_RECOGNITION',
  USAGE_STIMULATION = 'USAGE_STIMULATION',
  WIN_BACK = 'WIN_BACK',
  PAYMENT_RESOLUTION = 'PAYMENT_RESOLUTION'
}

export enum CommunicationTone {
  WARM_APPRECIATIVE = 'WARM_APPRECIATIVE',
  CELEBRATORY_INCENTIVIZING = 'CELEBRATORY_INCENTIVIZING',
  HELPFUL_ENTICING = 'HELPFUL_ENTICING',
  ATTENTIVE_VALUE_FOCUSED = 'ATTENTIVE_VALUE_FOCUSED',
  CLEAR_COURTEOUS_FIRM = 'CLEAR_COURTEOUS_FIRM'
}

export interface IStrategyConfig {
  segment: CustomerSegmentType;
  objective: StrategyObjective;
  primaryTone: CommunicationTone;
  alternativeTones: CommunicationTone[];
  recommendedActions: string[];
  priority: number;
  description: string;
  allowPromotionsWithOverdue: boolean;
  isActive: boolean;
  updatedAt?: Date;
}

export interface StrategyEvaluationResult {
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

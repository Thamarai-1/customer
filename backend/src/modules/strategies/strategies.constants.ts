import { CustomerSegmentType } from '../segmentation/segmentation.constants.js';
import { StrategyObjective, CommunicationTone, IStrategyConfig } from './strategies.types.js';

export const DEFAULT_STRATEGY_CONFIGS: Record<CustomerSegmentType, IStrategyConfig> = {
  [CustomerSegmentType.OVERDUE_BILL]: {
    segment: CustomerSegmentType.OVERDUE_BILL,
    objective: StrategyObjective.PAYMENT_RESOLUTION,
    primaryTone: CommunicationTone.CLEAR_COURTEOUS_FIRM,
    alternativeTones: [],
    recommendedActions: [
      'SEND_PAYMENT_REMINDER',
      'PROVIDE_DIRECT_PAYMENT_LINK',
      'OFFER_PAYMENT_PLAN_IF_ELIGIBLE',
      'EXPLAIN_GRACE_PERIOD'
    ],
    priority: 1,
    description: 'Resolve outstanding invoices, protect revenue, and support customer account rehabilitation.',
    allowPromotionsWithOverdue: false,
    isActive: true
  },
  [CustomerSegmentType.INACTIVE]: {
    segment: CustomerSegmentType.INACTIVE,
    objective: StrategyObjective.WIN_BACK,
    primaryTone: CommunicationTone.ATTENTIVE_VALUE_FOCUSED,
    alternativeTones: [CommunicationTone.HELPFUL_ENTICING],
    recommendedActions: [
      'SEND_REACTIVATION_OFFER',
      'HIGHLIGHT_NEW_FEATURES_AND_VALUE',
      'REQUEST_FEEDBACK_ON_INACTIVITY',
      'PROVIDE_FRICTIONLESS_LOGIN_LINK'
    ],
    priority: 2,
    description: 'Re-engage dormant customers who have ceased active usage with tailored win-back incentives.',
    allowPromotionsWithOverdue: false,
    isActive: true
  },
  [CustomerSegmentType.DECLINING_ACTIVITY]: {
    segment: CustomerSegmentType.DECLINING_ACTIVITY,
    objective: StrategyObjective.USAGE_STIMULATION,
    primaryTone: CommunicationTone.HELPFUL_ENTICING,
    alternativeTones: [CommunicationTone.WARM_APPRECIATIVE],
    recommendedActions: [
      'SHARE_PRODUCT_TIPS_AND_BEST_PRACTICES',
      'OFFER_COMPLIMENTARY_ADD_ON_OR_BOOST',
      'CHECK_IN_FOR_SUPPORT_OR_BLOCKERS',
      'INCENTIVIZE_NEXT_TRANSACTION'
    ],
    priority: 3,
    description: 'Arrest engagement drop-off and re-stimulate active product or service utilization.',
    allowPromotionsWithOverdue: false,
    isActive: true
  },
  [CustomerSegmentType.LOYALTY_CANDIDATE]: {
    segment: CustomerSegmentType.LOYALTY_CANDIDATE,
    objective: StrategyObjective.LOYALTY_RECOGNITION,
    primaryTone: CommunicationTone.CELEBRATORY_INCENTIVIZING,
    alternativeTones: [CommunicationTone.WARM_APPRECIATIVE],
    recommendedActions: [
      'CONGRATULATE_ON_LOYALTY_MILESTONE',
      'PRESENT_EXCLUSIVE_VIP_REWARD',
      'OFFER_TIER_UPGRADE_OR_EXTRA_POINTS',
      'INVITE_TO_EARLY_ACCESS_PROGRAM'
    ],
    priority: 4,
    description: 'Recognize high-value, highly-engaged customers and deepen loyalty through exclusive benefits.',
    allowPromotionsWithOverdue: false,
    isActive: true
  },
  [CustomerSegmentType.CONSISTENT_CUSTOMER]: {
    segment: CustomerSegmentType.CONSISTENT_CUSTOMER,
    objective: StrategyObjective.RELATIONSHIP_NURTURE,
    primaryTone: CommunicationTone.WARM_APPRECIATIVE,
    alternativeTones: [CommunicationTone.HELPFUL_ENTICING],
    recommendedActions: [
      'THANK_CUSTOMER_FOR_CONTINUED_PARTNERSHIP',
      'REINFORCE_ACCOUNT_VALUE_DELIVERED',
      'OFFER_CONSISTENCY_PERK',
      'SHARE_RELEVANT_ACCOUNT_OPTIMIZATION_TIPS'
    ],
    priority: 5,
    description: 'Nurture reliable, on-time, active customers to sustain long-term retention and satisfaction.',
    allowPromotionsWithOverdue: false,
    isActive: true
  }
};

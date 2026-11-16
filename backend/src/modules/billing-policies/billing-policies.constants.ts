import { IBillingPolicyConfig, ReminderStage } from './billing-policies.types.js';

export const DEFAULT_BILLING_POLICY_CONFIG: IBillingPolicyConfig = {
  upcomingDaysThreshold: 7,
  reminder1DaysThreshold: 7,
  reminder2DaysThreshold: 15,
  reminder3DaysThreshold: 30,
  escalationDaysThreshold: 30,
  requireHumanReviewForEscalation: true,
  excludeDisputedInvoices: true,
  minOutstandingAmountToRemind: 1.0
};

export const STAGE_SEVERITY: Record<ReminderStage, number> = {
  [ReminderStage.NONE]: 0,
  [ReminderStage.UPCOMING]: 1,
  [ReminderStage.REMINDER_1]: 2,
  [ReminderStage.REMINDER_2]: 3,
  [ReminderStage.REMINDER_3]: 4,
  [ReminderStage.ESCALATION_REVIEW]: 5
};

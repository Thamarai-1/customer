export enum ReminderStage {
  NONE = 'NONE',
  UPCOMING = 'UPCOMING',
  REMINDER_1 = 'REMINDER_1',
  REMINDER_2 = 'REMINDER_2',
  REMINDER_3 = 'REMINDER_3',
  ESCALATION_REVIEW = 'ESCALATION_REVIEW'
}

export interface IInvoiceReminderDetail {
  invoiceId: string;
  invoiceAmount: number;
  outstandingAmount: number;
  currency: string;
  dueDate: Date;
  daysOverdue: number;
  stage: ReminderStage;
  isDisputed: boolean;
  disputeReason?: string;
  recommendedAction: string;
}

export interface IBillingReminderEvaluation {
  customerId: string;
  evaluatedAt: Date;
  highestStage: ReminderStage;
  requiresHumanReview: boolean;
  hasDisputedInvoices: boolean;
  totalOutstandingByCurrency: Record<string, number>;
  totalOverdueByCurrency: Record<string, number>;
  invoices: IInvoiceReminderDetail[];
  disputedInvoices: IInvoiceReminderDetail[];
  summaryMessage: string;
  recommendedAction: string;
}

export interface IBillingPolicyConfig {
  upcomingDaysThreshold: number;
  reminder1DaysThreshold: number;
  reminder2DaysThreshold: number;
  reminder3DaysThreshold: number;
  escalationDaysThreshold: number;
  requireHumanReviewForEscalation: boolean;
  excludeDisputedInvoices: boolean;
  minOutstandingAmountToRemind: number;
  updatedAt?: Date;
}

import { IBillingRecord } from '../billing/billing-record.model.js';
import {
  ReminderStage,
  IInvoiceReminderDetail,
  IBillingReminderEvaluation,
  IBillingPolicyConfig
} from './billing-policies.types.js';
import { DEFAULT_BILLING_POLICY_CONFIG, STAGE_SEVERITY } from './billing-policies.constants.js';

export class ReminderEvaluator {
  /**
   * Deterministically evaluates a customer's invoices against billing policies.
   */
  static evaluate(
    customerId: string,
    invoices: IBillingRecord[],
    config: IBillingPolicyConfig = DEFAULT_BILLING_POLICY_CONFIG,
    asOfDate: Date = new Date()
  ): IBillingReminderEvaluation {
    const totalOutstandingByCurrency: Record<string, number> = {};
    const totalOverdueByCurrency: Record<string, number> = {};
    const invoiceDetails: IInvoiceReminderDetail[] = [];
    const disputedInvoices: IInvoiceReminderDetail[] = [];

    const nowTime = asOfDate.getTime();

    for (const inv of invoices) {
      // Exclude cancelled or closed invoices
      if (inv.invoiceStatus === 'CANCELLED' || inv.invoiceStatus === 'CLOSED') {
        continue;
      }

      const outstanding = Number(inv.outstandingAmount ?? 0);
      const currency = inv.currency || 'USD';

      // Record total outstanding if positive
      if (outstanding > 0) {
        totalOutstandingByCurrency[currency] = (totalOutstandingByCurrency[currency] ?? 0) + outstanding;
      }

      // Check for dispute
      const isDisputed = Boolean(
        inv.disputeStatus &&
        inv.disputeStatus.toUpperCase() !== 'NONE' &&
        inv.disputeStatus.toUpperCase() !== 'RESOLVED'
      );

      const dueDateTime = new Date(inv.dueDate).getTime();
      const diffMs = nowTime - dueDateTime;
      const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // Record overdue amount if past due and outstanding
      if (daysOverdue > 0 && outstanding >= config.minOutstandingAmountToRemind) {
        totalOverdueByCurrency[currency] = (totalOverdueByCurrency[currency] ?? 0) + outstanding;
      }

      // If fully paid or negligible balance
      if (outstanding < config.minOutstandingAmountToRemind) {
        continue;
      }

      if (isDisputed) {
        disputedInvoices.push({
          invoiceId: inv.invoiceId,
          invoiceAmount: inv.invoiceAmount,
          outstandingAmount: outstanding,
          currency,
          dueDate: inv.dueDate,
          daysOverdue,
          stage: ReminderStage.NONE,
          isDisputed: true,
          disputeReason: inv.disputeStatus,
          recommendedAction: 'DISPUTE_IN_REVIEW - Exclude from collection escalations pending investigation'
        });
        if (config.excludeDisputedInvoices) {
          continue;
        }
      }

      // Determine stage for active non-disputed invoice
      let stage = ReminderStage.NONE;
      let recommendedAction = 'NO_ACTION_REQUIRED';

      if (daysOverdue > config.escalationDaysThreshold) {
        stage = ReminderStage.ESCALATION_REVIEW;
        recommendedAction = 'ESCALATION_TO_FINANCIAL_OPS - Account over 30 days delinquent; requires human review';
      } else if (daysOverdue > config.reminder2DaysThreshold) {
        stage = ReminderStage.REMINDER_3;
        recommendedAction = 'URGENT_NOTICE - Final notice prior to potential service disruption';
      } else if (daysOverdue > config.reminder1DaysThreshold) {
        stage = ReminderStage.REMINDER_2;
        recommendedAction = 'SECOND_REMINDER - Firm notice highlighting unpaid balance and payment methods';
      } else if (daysOverdue >= 1) {
        stage = ReminderStage.REMINDER_1;
        recommendedAction = 'FIRST_REMINDER - Courteous payment reminder for recently overdue invoice';
      } else if (daysOverdue <= 0 && Math.abs(daysOverdue) <= config.upcomingDaysThreshold) {
        stage = ReminderStage.UPCOMING;
        recommendedAction = 'UPCOMING_DUE_NOTICE - Polite notice for invoice due in near future';
      }

      invoiceDetails.push({
        invoiceId: inv.invoiceId,
        invoiceAmount: inv.invoiceAmount,
        outstandingAmount: outstanding,
        currency,
        dueDate: inv.dueDate,
        daysOverdue,
        stage,
        isDisputed: false,
        recommendedAction
      });
    }

    // Determine highest stage
    let highestStage = ReminderStage.NONE;
    for (const item of invoiceDetails) {
      if (STAGE_SEVERITY[item.stage] > STAGE_SEVERITY[highestStage]) {
        highestStage = item.stage;
      }
    }

    const requiresHumanReview =
      config.requireHumanReviewForEscalation &&
      (highestStage === ReminderStage.ESCALATION_REVIEW ||
        invoiceDetails.some((i) => i.daysOverdue > config.escalationDaysThreshold));

    const hasDisputedInvoices = disputedInvoices.length > 0;

    // Build human-readable summary
    let summaryMessage = 'All invoices are in good standing; no billing action required.';
    let overallAction = 'NO_ACTION_REQUIRED';

    if (highestStage === ReminderStage.ESCALATION_REVIEW) {
      summaryMessage = `Critical: Customer has invoice(s) exceeding ${config.escalationDaysThreshold} days overdue. Escalation review required.`;
      overallAction = 'ESCALATE_FOR_HUMAN_APPROVAL';
    } else if (highestStage === ReminderStage.REMINDER_3) {
      summaryMessage = 'Urgent: Customer has invoice(s) 16-30 days overdue. Send final warning reminder.';
      overallAction = 'DISPATCH_REMINDER_3';
    } else if (highestStage === ReminderStage.REMINDER_2) {
      summaryMessage = 'Customer has invoice(s) 8-15 days overdue. Send second payment reminder.';
      overallAction = 'DISPATCH_REMINDER_2';
    } else if (highestStage === ReminderStage.REMINDER_1) {
      summaryMessage = 'Customer has recently overdue invoice(s). Send friendly first reminder.';
      overallAction = 'DISPATCH_REMINDER_1';
    } else if (highestStage === ReminderStage.UPCOMING) {
      summaryMessage = 'Customer has upcoming invoice due within reminder window.';
      overallAction = 'DISPATCH_UPCOMING_REMINDER';
    } else if (hasDisputedInvoices) {
      summaryMessage = 'Invoices are currently under dispute. Collection activities suspended.';
      overallAction = 'MAINTAIN_DISPUTE_HOLD';
    }

    return {
      customerId,
      evaluatedAt: asOfDate,
      highestStage,
      requiresHumanReview,
      hasDisputedInvoices,
      totalOutstandingByCurrency,
      totalOverdueByCurrency,
      invoices: invoiceDetails,
      disputedInvoices,
      summaryMessage,
      recommendedAction: overallAction
    };
  }
}

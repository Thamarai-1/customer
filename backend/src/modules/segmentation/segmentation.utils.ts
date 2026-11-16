import { ReasonCode, REASON_CODE_DESCRIPTIONS } from './segmentation.constants.js';
import { ISegmentationEvidence } from './segmentation.types.js';

export class SegmentationUtils {
  /**
   * Generates dynamic, evidence-grounded human-readable explanations for reason codes.
   */
  static generateExplanations(reasonCodes: ReasonCode[], evidence: ISegmentationEvidence): string[] {
    return reasonCodes.map((code) => {
      switch (code) {
        case ReasonCode.REGULAR_ACTIVITY:
          return `Customer logged ${evidence.activityCount30d} activities in the past 30 days, demonstrating steady ongoing platform interaction.`;

        case ReasonCode.ACTIVE_PLAN:
          return `Customer holds an active subscription under plan '${evidence.activePlan}' (${evidence.planType}).`;

        case ReasonCode.PAYMENT_ON_TIME:
          return `All billing invoices are fully paid on time with zero overdue balances across the billing history.`;

        case ReasonCode.CONSISTENT_ENGAGEMENT:
          return `Customer demonstrates consistent multi-month interaction frequency and positive account standing.`;

        case ReasonCode.HIGH_LOYALTY_POINTS:
          return `Customer has accumulated ${evidence.loyaltyPoints} loyalty points in ${evidence.loyaltyTier} tier, exceeding the qualification threshold.`;

        case ReasonCode.LONG_MEMBERSHIP_DURATION:
          return `Customer tenure of ${evidence.membershipDurationDays} days reflects strong long-term loyalty.`;

        case ReasonCode.HIGH_ENGAGEMENT:
          return `Customer generated ${evidence.activityCount30d} interactions in the past 30 days, reflecting high platform engagement.`;

        case ReasonCode.REPEATED_ACTIVITY:
          return `Customer shows consistent multi-week interaction cadence across services.`;

        case ReasonCode.POSITIVE_PAYMENT_HISTORY:
          return `Customer maintains a pristine payment record with zero overdue invoices and zero dispute flags.`;

        case ReasonCode.ACTIVITY_REDUCTION:
          return `Recent 30-day activity count dropped by ${evidence.activityReductionPercent ?? 0}% (from ${evidence.activityCountPrevious30d} down to ${evidence.activityCount30d} interactions).`;

        case ReasonCode.REDUCED_USAGE_FREQUENCY:
          return `Interaction frequency has tapered down from ${evidence.activityCountPrevious30d} events to ${evidence.activityCount30d} events over observation windows.`;

        case ReasonCode.INCREASING_ACTIVITY_GAP:
          return `Observed days since last activity (${evidence.daysSinceLastActivity ?? 0} days) indicate expanding gaps between interactions.`;

        case ReasonCode.NO_RECENT_ACTIVITY:
          return `No qualifying customer activity was recorded in the past ${evidence.daysSinceLastActivity ?? 'multiple'} days.`;

        case ReasonCode.INACTIVITY_THRESHOLD_EXCEEDED:
          return `Customer inactivity of ${evidence.daysSinceLastActivity ?? 0} days exceeds the dormancy threshold.`;

        case ReasonCode.EXTENDED_ACTIVITY_GAP:
          return `Customer has exhibited prolonged disengagement with no recent touchpoints.`;

        case ReasonCode.OVERDUE_INVOICE:
          return `Customer has ${evidence.overdueInvoiceCount} overdue invoice(s) totaling $${evidence.totalOutstandingAmount.toFixed(2)}.`;

        case ReasonCode.OUTSTANDING_BALANCE:
          return `Total past-due balance of $${evidence.totalOutstandingAmount.toFixed(2)} requires payment reminder action.`;

        case ReasonCode.PAYMENT_DUE_DATE_PASSED:
          return `Oldest overdue invoice (${evidence.oldestOverdueInvoiceId ?? 'N/A'}) is ${evidence.oldestOverdueDays} days past its due date.`;

        case ReasonCode.INSUFFICIENT_ACTIVITY_HISTORY:
          return `Customer has only ${evidence.lifetimeActivityCount} lifetime recorded activity event(s), which is insufficient for reliable behavioral classification.`;

        case ReasonCode.MISSING_BILLING_DATA:
          return `Billing ledger records are unavailable or empty for this customer account.`;

        case ReasonCode.DISPUTED_INVOICE_EXCLUDED:
          return `Customer has ${evidence.disputeCount} disputed invoice(s) under review, properly excluded from automated overdue reminder triggers.`;

        case ReasonCode.INSUFFICIENT_COMPARISON_BASELINE:
          return `Previous 30-day window had only ${evidence.activityCountPrevious30d} activity event(s), which is below the minimum baseline required to assess a meaningful decline.`;

        case ReasonCode.NO_SEGMENT_QUALIFIED:
          return `Customer was evaluated against all active segmentation rules and did not qualify for any primary behavioral category.`;

        default:
          return REASON_CODE_DESCRIPTIONS[code] || code;
      }
    });
  }

  /**
   * Deterministically calculates classification confidence based on data completeness and history depth.
   */
  static calculateConfidence(evidence: ISegmentationEvidence, isInsufficientData: boolean): number {
    if (isInsufficientData) {
      return 0.35;
    }

    let confidence = 1.0;

    // Deduct for missing or sparse activity history
    if (!evidence.hasActivityData || evidence.lifetimeActivityCount === 0) {
      confidence -= 0.30;
    } else if (evidence.lifetimeActivityCount < 3) {
      confidence -= 0.15;
    }

    // Deduct for missing billing data
    if (!evidence.hasBillingData) {
      confidence -= 0.20;
    }

    // Minor deduction if membership start date is unknown/zero
    if (evidence.membershipDurationDays <= 0) {
      confidence -= 0.05;
    }

    // Deduct for active disputes adding ambiguity to customer relationship
    if (evidence.hasDisputedInvoices) {
      confidence -= 0.05;
    }

    // Bound between 0.1 and 1.0, rounded to 2 decimal places
    return Math.max(0.1, Math.min(1.0, Math.round(confidence * 100) / 100));
  }
}

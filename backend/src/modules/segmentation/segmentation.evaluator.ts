import {
  CustomerSegmentType,
  ClassificationStatus,
  ReasonCode
} from './segmentation.constants.js';
import {
  ISegmentationEvidence,
  ISegmentationResult,
  ISegmentationConfig
} from './segmentation.types.js';
import { AssembledCustomerProfile } from '../customers/customer-profile.service.js';
import { IBillingRecord, PaymentStatus } from '../billing/billing-record.model.js';
import { SegmentationUtils } from './segmentation.utils.js';

export class SegmentationEvaluator {
  /**
   * Deterministically evaluates an assembled customer profile, billing ledger,
   * and activity history against configured business thresholds.
   */
  static evaluate(
    customerProfile: AssembledCustomerProfile,
    invoices: IBillingRecord[],
    lifetimeActivityCount: number,
    config: ISegmentationConfig,
    evaluationDate: Date = new Date()
  ): ISegmentationResult {
    const { customer, subscription, activity, billing } = customerProfile;

    // 1. Calculate Activity Metrics
    const lastActivityDate = activity.lastActivityDate
      ? new Date(activity.lastActivityDate)
      : null;

    const daysSinceLastActivity = lastActivityDate
      ? Math.max(
          0,
          Math.floor(
            (evaluationDate.getTime() - lastActivityDate.getTime()) / (24 * 60 * 60 * 1000)
          )
        )
      : null;

    const activityCount30d = activity.activityCount30d || 0;
    const activityCountPrevious30d = activity.activityCountPrevious30d || 0;

    let activityReductionPercent: number | null = null;
    if (activityCountPrevious30d > 0) {
      const drop = activityCountPrevious30d - activityCount30d;
      activityReductionPercent = Math.max(0, Math.round((drop / activityCountPrevious30d) * 100));
    }

    // 2. Calculate Membership Tenure
    const membershipStartDate = customer.membershipStartDate
      ? new Date(customer.membershipStartDate)
      : new Date(customer.createdAt);

    const membershipDurationDays = Math.max(
      0,
      Math.floor(
        (evaluationDate.getTime() - membershipStartDate.getTime()) / (24 * 60 * 60 * 1000)
      )
    );

    // 3. Analyze Invoices (Distinguishing Disputed vs Overdue)
    let totalOutstandingAmount = 0;
    let disputeCount = 0;
    let nonDisputedOverdueInvoices: IBillingRecord[] = [];
    let disputedOverdueInvoices: IBillingRecord[] = [];

    for (const inv of invoices) {
      if (inv.outstandingAmount > 0) {
        totalOutstandingAmount += inv.outstandingAmount;
      }

      const isDisputed = inv.disputeStatus && inv.disputeStatus !== 'NONE';
      if (isDisputed) {
        disputeCount++;
      }

      // Check if past due date and unpaid
      const isPastDue =
        new Date(inv.dueDate).getTime() < evaluationDate.getTime() &&
        inv.paymentStatus !== PaymentStatus.PAID &&
        inv.outstandingAmount > 0;

      if (isPastDue) {
        if (isDisputed) {
          disputedOverdueInvoices.push(inv);
        } else {
          nonDisputedOverdueInvoices.push(inv);
        }
      }
    }

    totalOutstandingAmount = Math.round(totalOutstandingAmount * 100) / 100;

    // Sort non-disputed overdue invoices by due date ascending (oldest first)
    nonDisputedOverdueInvoices.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

    const oldestOverdueInvoice = nonDisputedOverdueInvoices[0] || null;
    const oldestOverdueDays = oldestOverdueInvoice
      ? Math.max(
          0,
          Math.floor(
            (evaluationDate.getTime() - new Date(oldestOverdueInvoice.dueDate).getTime()) /
              (24 * 60 * 60 * 1000)
          )
        )
      : 0;

    const overdueInvoiceIds = nonDisputedOverdueInvoices.map((inv) => inv.invoiceId);
    const hasNonDisputedOverdue = nonDisputedOverdueInvoices.length > 0;
    const hasDisputedInvoices = billing.hasDisputedInvoices || disputeCount > 0;

    // 4. Assemble Verified Evidence
    const evidence: ISegmentationEvidence = {
      lastActivityDate: lastActivityDate ? lastActivityDate.toISOString() : null,
      daysSinceLastActivity,
      activityCount30d,
      activityCountPrevious30d,
      activityReductionPercent,
      lifetimeActivityCount,
      loyaltyTier: customer.loyaltyTier || 'BRONZE',
      loyaltyPoints: customer.loyaltyPoints || 0,
      membershipDurationDays,
      activePlan: subscription.activePlan,
      planStatus: subscription.planStatus,
      planType: subscription.planType,
      totalInvoiced: billing.totalInvoiced || 0,
      totalOutstandingAmount,
      overdueInvoiceCount: nonDisputedOverdueInvoices.length,
      oldestOverdueDays,
      oldestOverdueInvoiceId: oldestOverdueInvoice ? oldestOverdueInvoice.invoiceId : null,
      overdueInvoiceIds,
      disputeCount,
      hasDisputedInvoices,
      hasNonDisputedOverdue,
      hasActivityData: lifetimeActivityCount > 0,
      hasBillingData: invoices.length > 0,
      hasSubscriptionData: !!subscription.activePlan
    };

    // 5. Data Sufficiency Guard
    // If a customer has no activity recorded and no billing history, return INSUFFICIENT_DATA
    if (!evidence.hasActivityData && !evidence.hasBillingData) {
      const reasonCodes = [
        ReasonCode.INSUFFICIENT_ACTIVITY_HISTORY,
        ReasonCode.MISSING_BILLING_DATA
      ];
      return {
        customerId: customer.customerId,
        customerRef: customer.id,
        primarySegment: null,
        segments: [],
        classificationStatus: ClassificationStatus.INSUFFICIENT_DATA,
        confidence: SegmentationUtils.calculateConfidence(evidence, true),
        reasonCodes,
        explanations: SegmentationUtils.generateExplanations(reasonCodes, evidence),
        evidence,
        ruleVersion: config.ruleVersion,
        classifiedAt: evaluationDate
      };
    }

    // If zero activities recorded for a new customer and no past due bills, flag insufficient activity data
    if (!evidence.hasActivityData && !hasNonDisputedOverdue && membershipDurationDays < 30) {
      const reasonCodes = [ReasonCode.INSUFFICIENT_ACTIVITY_HISTORY];
      return {
        customerId: customer.customerId,
        customerRef: customer.id,
        primarySegment: null,
        segments: [],
        classificationStatus: ClassificationStatus.INSUFFICIENT_DATA,
        confidence: SegmentationUtils.calculateConfidence(evidence, true),
        reasonCodes,
        explanations: SegmentationUtils.generateExplanations(reasonCodes, evidence),
        evidence,
        ruleVersion: config.ruleVersion,
        classifiedAt: evaluationDate
      };
    }

    // 6. Evaluate Segment Rules
    const qualifyingSegments: CustomerSegmentType[] = [];
    const reasonCodesSet = new Set<ReasonCode>();

    // A. OVERDUE_BILL Rule
    if (hasNonDisputedOverdue) {
      qualifyingSegments.push(CustomerSegmentType.OVERDUE_BILL);
      reasonCodesSet.add(ReasonCode.OVERDUE_INVOICE);
      reasonCodesSet.add(ReasonCode.OUTSTANDING_BALANCE);
      reasonCodesSet.add(ReasonCode.PAYMENT_DUE_DATE_PASSED);

      if (disputedOverdueInvoices.length > 0) {
        reasonCodesSet.add(ReasonCode.DISPUTED_INVOICE_EXCLUDED);
      }
    } else if (disputedOverdueInvoices.length > 0) {
      // All overdue invoices are disputed, explicitly exclude from overdue reminder
      reasonCodesSet.add(ReasonCode.DISPUTED_INVOICE_EXCLUDED);
    }

    // B. INACTIVE Rule
    const isInactiveByDays =
      daysSinceLastActivity !== null &&
      daysSinceLastActivity >= config.inactivityThresholdDays;

    if (isInactiveByDays && evidence.hasActivityData) {
      qualifyingSegments.push(CustomerSegmentType.INACTIVE);
      reasonCodesSet.add(ReasonCode.NO_RECENT_ACTIVITY);
      reasonCodesSet.add(ReasonCode.INACTIVITY_THRESHOLD_EXCEEDED);
      reasonCodesSet.add(ReasonCode.EXTENDED_ACTIVITY_GAP);
    }

    // C. DECLINING_ACTIVITY Rule
    if (activityCountPrevious30d >= config.minBaselineActivityCount) {
      if (
        activityReductionPercent !== null &&
        activityReductionPercent >= config.activityReductionThresholdPercent
      ) {
        qualifyingSegments.push(CustomerSegmentType.DECLINING_ACTIVITY);
        reasonCodesSet.add(ReasonCode.ACTIVITY_REDUCTION);
        reasonCodesSet.add(ReasonCode.REDUCED_USAGE_FREQUENCY);
        reasonCodesSet.add(ReasonCode.INCREASING_ACTIVITY_GAP);
      }
    } else if (activityCountPrevious30d < config.minBaselineActivityCount && activityCount30d < activityCountPrevious30d) {
      reasonCodesSet.add(ReasonCode.INSUFFICIENT_COMPARISON_BASELINE);
    }

    // D. LOYALTY_CANDIDATE Rule
    const isHighTier =
      customer.loyaltyTier === 'GOLD' || customer.loyaltyTier === 'PLATINUM';
    const hasHighPoints = (customer.loyaltyPoints || 0) >= config.loyaltyPointsThreshold;
    const hasLongTenure = membershipDurationDays >= config.membershipDurationDaysThreshold;
    const isActiveAccount = customer.accountStatus === 'ACTIVE';

    if ((hasHighPoints || isHighTier) && hasLongTenure && isActiveAccount) {
      qualifyingSegments.push(CustomerSegmentType.LOYALTY_CANDIDATE);
      if (hasHighPoints || isHighTier) reasonCodesSet.add(ReasonCode.HIGH_LOYALTY_POINTS);
      if (hasLongTenure) reasonCodesSet.add(ReasonCode.LONG_MEMBERSHIP_DURATION);
      if (activityCount30d >= config.consistentMinMonthlyActivities) {
        reasonCodesSet.add(ReasonCode.HIGH_ENGAGEMENT);
      }
      if (!hasNonDisputedOverdue) {
        reasonCodesSet.add(ReasonCode.POSITIVE_PAYMENT_HISTORY);
      }
    }

    // E. CONSISTENT_CUSTOMER Rule
    const isConsistent =
      isActiveAccount &&
      subscription.planStatus === 'ACTIVE' &&
      activityCount30d >= config.consistentMinMonthlyActivities &&
      !hasNonDisputedOverdue &&
      totalOutstandingAmount === 0;

    if (isConsistent) {
      qualifyingSegments.push(CustomerSegmentType.CONSISTENT_CUSTOMER);
      reasonCodesSet.add(ReasonCode.REGULAR_ACTIVITY);
      reasonCodesSet.add(ReasonCode.ACTIVE_PLAN);
      reasonCodesSet.add(ReasonCode.PAYMENT_ON_TIME);
      reasonCodesSet.add(ReasonCode.CONSISTENT_ENGAGEMENT);
    }

    // 7. Select Primary Segment by Configured Priority
    let primarySegment: CustomerSegmentType | null = null;
    const priorityList = config.segmentPriority || [
      CustomerSegmentType.OVERDUE_BILL,
      CustomerSegmentType.INACTIVE,
      CustomerSegmentType.DECLINING_ACTIVITY,
      CustomerSegmentType.LOYALTY_CANDIDATE,
      CustomerSegmentType.CONSISTENT_CUSTOMER
    ];

    for (const prioritySegment of priorityList) {
      if (qualifyingSegments.includes(prioritySegment)) {
        primarySegment = prioritySegment;
        break;
      }
    }

    // If no segment qualified
    if (qualifyingSegments.length === 0) {
      reasonCodesSet.add(ReasonCode.NO_SEGMENT_QUALIFIED);
    }

    const reasonCodes = Array.from(reasonCodesSet);
    const explanations = SegmentationUtils.generateExplanations(reasonCodes, evidence);
    const confidence = SegmentationUtils.calculateConfidence(evidence, false);

    return {
      customerId: customer.customerId,
      customerRef: customer.id,
      primarySegment,
      segments: qualifyingSegments,
      classificationStatus: ClassificationStatus.CLASSIFIED,
      confidence,
      reasonCodes,
      explanations,
      evidence,
      ruleVersion: config.ruleVersion,
      classifiedAt: evaluationDate
    };
  }
}

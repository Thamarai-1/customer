/**
 * Segmentation Engine Constants
 * Customer Loyalty and Engagement Assistant - Phase 3
 */

export enum CustomerSegmentType {
  CONSISTENT_CUSTOMER = 'CONSISTENT_CUSTOMER',
  LOYALTY_CANDIDATE = 'LOYALTY_CANDIDATE',
  DECLINING_ACTIVITY = 'DECLINING_ACTIVITY',
  INACTIVE = 'INACTIVE',
  OVERDUE_BILL = 'OVERDUE_BILL'
}

export enum ClassificationStatus {
  CLASSIFIED = 'CLASSIFIED',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  UNCLASSIFIED = 'UNCLASSIFIED'
}

export enum ReasonCode {
  // Consistent Customer
  REGULAR_ACTIVITY = 'REGULAR_ACTIVITY',
  ACTIVE_PLAN = 'ACTIVE_PLAN',
  PAYMENT_ON_TIME = 'PAYMENT_ON_TIME',
  CONSISTENT_ENGAGEMENT = 'CONSISTENT_ENGAGEMENT',

  // Loyalty Candidate
  HIGH_LOYALTY_POINTS = 'HIGH_LOYALTY_POINTS',
  LONG_MEMBERSHIP_DURATION = 'LONG_MEMBERSHIP_DURATION',
  HIGH_ENGAGEMENT = 'HIGH_ENGAGEMENT',
  REPEATED_ACTIVITY = 'REPEATED_ACTIVITY',
  POSITIVE_PAYMENT_HISTORY = 'POSITIVE_PAYMENT_HISTORY',

  // Declining Activity
  ACTIVITY_REDUCTION = 'ACTIVITY_REDUCTION',
  REDUCED_USAGE_FREQUENCY = 'REDUCED_USAGE_FREQUENCY',
  INCREASING_ACTIVITY_GAP = 'INCREASING_ACTIVITY_GAP',

  // Inactive / Dormant Customer
  NO_RECENT_ACTIVITY = 'NO_RECENT_ACTIVITY',
  INACTIVITY_THRESHOLD_EXCEEDED = 'INACTIVITY_THRESHOLD_EXCEEDED',
  EXTENDED_ACTIVITY_GAP = 'EXTENDED_ACTIVITY_GAP',

  // Overdue Bill / Payment Reminder
  OVERDUE_INVOICE = 'OVERDUE_INVOICE',
  OUTSTANDING_BALANCE = 'OUTSTANDING_BALANCE',
  PAYMENT_DUE_DATE_PASSED = 'PAYMENT_DUE_DATE_PASSED',

  // Insufficient Data & Explicit Exclusions
  INSUFFICIENT_ACTIVITY_HISTORY = 'INSUFFICIENT_ACTIVITY_HISTORY',
  MISSING_BILLING_DATA = 'MISSING_BILLING_DATA',
  DISPUTED_INVOICE_EXCLUDED = 'DISPUTED_INVOICE_EXCLUDED',
  INSUFFICIENT_COMPARISON_BASELINE = 'INSUFFICIENT_COMPARISON_BASELINE',
  NO_SEGMENT_QUALIFIED = 'NO_SEGMENT_QUALIFIED'
}

export const REASON_CODE_DESCRIPTIONS: Record<ReasonCode, string> = {
  [ReasonCode.REGULAR_ACTIVITY]: 'Customer has demonstrated regular, steady activity during the observation period.',
  [ReasonCode.ACTIVE_PLAN]: 'Customer holds an active and current subscription or service plan.',
  [ReasonCode.PAYMENT_ON_TIME]: 'All billing invoices are fully paid on time with zero overdue balances.',
  [ReasonCode.CONSISTENT_ENGAGEMENT]: 'Demonstrates sustained engagement and reliable account standing.',

  [ReasonCode.HIGH_LOYALTY_POINTS]: 'Customer loyalty points exceed the configured qualification threshold.',
  [ReasonCode.LONG_MEMBERSHIP_DURATION]: 'Customer membership tenure exceeds the configured longevity threshold.',
  [ReasonCode.HIGH_ENGAGEMENT]: 'Demonstrates repeated high engagement and strong interaction frequency.',
  [ReasonCode.REPEATED_ACTIVITY]: 'Consistently generates ongoing platform and account interactions.',
  [ReasonCode.POSITIVE_PAYMENT_HISTORY]: 'Clean financial payment history with no delinquent balance.',

  [ReasonCode.ACTIVITY_REDUCTION]: 'Recent 30-day activity count has reduced significantly compared with the prior 30-day baseline.',
  [ReasonCode.REDUCED_USAGE_FREQUENCY]: 'Frequency of interactions is tapering off across observation periods.',
  [ReasonCode.INCREASING_ACTIVITY_GAP]: 'Gaps between recorded customer events are expanding.',

  [ReasonCode.NO_RECENT_ACTIVITY]: 'No qualifying customer activity was recorded during the inactivity observation window.',
  [ReasonCode.INACTIVITY_THRESHOLD_EXCEEDED]: 'Days since last recorded activity exceeds the configured dormancy threshold.',
  [ReasonCode.EXTENDED_ACTIVITY_GAP]: 'Prolonged period without meaningful platform engagement.',

  [ReasonCode.OVERDUE_INVOICE]: 'Customer has one or more unpaid invoices past their due date.',
  [ReasonCode.OUTSTANDING_BALANCE]: 'Total outstanding balance exceeds grace tolerance.',
  [ReasonCode.PAYMENT_DUE_DATE_PASSED]: 'Invoice payment due date has lapsed without completed payment.',

  [ReasonCode.INSUFFICIENT_ACTIVITY_HISTORY]: 'Insufficient historical activity data to reliably classify customer engagement.',
  [ReasonCode.MISSING_BILLING_DATA]: 'Billing records are absent or incomplete for payment reliability classification.',
  [ReasonCode.DISPUTED_INVOICE_EXCLUDED]: 'Overdue invoice is currently marked as disputed and excluded from payment reminder classification.',
  [ReasonCode.INSUFFICIENT_COMPARISON_BASELINE]: 'Historical activity baseline is too low for a statistically valid percentage drop calculation.',
  [ReasonCode.NO_SEGMENT_QUALIFIED]: 'Customer profile was evaluated against all rules but met none of the specific segment criteria.'
};

export const SEGMENT_DEFINITIONS: Record<
  CustomerSegmentType,
  { name: string; description: string; priority: number }
> = {
  [CustomerSegmentType.OVERDUE_BILL]: {
    name: 'Overdue Bill / Payment Reminder',
    description: 'Customers with one or more unpaid invoices past their due date requiring billing engagement.',
    priority: 1
  },
  [CustomerSegmentType.INACTIVE]: {
    name: 'Inactive / Dormant Customer',
    description: 'Customers with no recorded activity for an extended period exceeding the inactivity threshold.',
    priority: 2
  },
  [CustomerSegmentType.DECLINING_ACTIVITY]: {
    name: 'Declining Activity',
    description: 'Customers whose recent engagement has reduced significantly compared with their historical baseline.',
    priority: 3
  },
  [CustomerSegmentType.LOYALTY_CANDIDATE]: {
    name: 'Loyalty Candidate',
    description: 'High-value patrons with elevated loyalty points, strong tenure, and positive payment standing.',
    priority: 4
  },
  [CustomerSegmentType.CONSISTENT_CUSTOMER]: {
    name: 'Consistent Customer',
    description: 'Customers demonstrating regular engagement, active subscription, and timely payment behaviour.',
    priority: 5
  }
};

export const DEFAULT_SEGMENT_PRIORITY: CustomerSegmentType[] = [
  CustomerSegmentType.OVERDUE_BILL,
  CustomerSegmentType.INACTIVE,
  CustomerSegmentType.DECLINING_ACTIVITY,
  CustomerSegmentType.LOYALTY_CANDIDATE,
  CustomerSegmentType.CONSISTENT_CUSTOMER
];

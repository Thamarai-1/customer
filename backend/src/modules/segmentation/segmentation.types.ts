import { CustomerSegmentType, ClassificationStatus, ReasonCode } from './segmentation.constants.js';

export interface ISegmentationEvidence {
  // Activity evidence
  lastActivityDate: string | null;
  daysSinceLastActivity: number | null;
  activityCount30d: number;
  activityCountPrevious30d: number;
  activityReductionPercent: number | null;
  lifetimeActivityCount: number;

  // Loyalty evidence
  loyaltyTier: string;
  loyaltyPoints: number;
  membershipDurationDays: number;

  // Subscription evidence
  activePlan: string;
  planStatus: string;
  planType: string;

  // Billing evidence
  totalInvoiced: number;
  totalOutstandingAmount: number;
  overdueInvoiceCount: number;
  oldestOverdueDays: number;
  oldestOverdueInvoiceId: string | null;
  overdueInvoiceIds: string[];
  disputeCount: number;
  hasDisputedInvoices: boolean;
  hasNonDisputedOverdue: boolean;

  // Completeness flags
  hasActivityData: boolean;
  hasBillingData: boolean;
  hasSubscriptionData: boolean;
}

export interface ISegmentationResult {
  customerId: string;
  customerRef?: string;
  primarySegment: CustomerSegmentType | null;
  segments: CustomerSegmentType[];
  classificationStatus: ClassificationStatus;
  confidence: number;
  reasonCodes: ReasonCode[];
  explanations: string[];
  evidence: ISegmentationEvidence;
  ruleVersion: string;
  classifiedAt: Date;
}

export interface ISegmentationConfig {
  ruleVersion: string;
  activityObservationDays: number;
  previousActivityComparisonDays: number;
  activityReductionThresholdPercent: number;
  minBaselineActivityCount: number;
  inactivityThresholdDays: number;
  minTotalActivitiesForHistory: number;
  loyaltyPointsThreshold: number;
  membershipDurationDaysThreshold: number;
  consistentMinMonthlyActivities: number;
  segmentPriority: CustomerSegmentType[];
  updatedBy?: string;
  updatedAt?: Date;
  notes?: string;
}

export interface ISegmentationStatistics {
  totalCustomers: number;
  classifiedCustomers: number;
  unclassifiedCustomers: number;
  insufficientDataCustomers: number;
  multiSegmentCustomers: number;
  segmentCounts: Record<CustomerSegmentType, number>;
  segmentPercentages: Record<CustomerSegmentType, number>;
  primarySegmentCounts: Record<CustomerSegmentType, number>;
  lastRunTimestamp: Date | null;
}

export interface ClassifyAllSummary {
  totalCustomers: number;
  processedCount: number;
  classifiedCount: number;
  insufficientDataCount: number;
  failedCount: number;
  multiSegmentCount: number;
  durationMs: number;
  errors?: Array<{ customerId: string; error: string }>;
}

export interface SegmentationQueryFilters {
  primarySegment?: CustomerSegmentType;
  segment?: CustomerSegmentType;
  status?: ClassificationStatus;
  minConfidence?: number;
  search?: string;
}

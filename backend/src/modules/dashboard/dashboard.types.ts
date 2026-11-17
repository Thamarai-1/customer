export interface DashboardOverviewResponse {
  customers: {
    total: number;
    active: number;
    dormant: number;
    declining: number;
    loyaltyCandidates: number;
    overdueBilling: number;
  };
  campaigns: {
    total: number;
    active: number;
    activeOffers: number;
    estimatedEligible: number;
    estimatedIneligible: number;
  };
  aiGeneration: {
    totalGenerated: number;
    bySegment: Record<string, number>;
    byProvider: Record<string, number>;
    failures: number;
    averageLatencyMs: number;
  };
  compliance: {
    passed: number;
    passedWithWarnings: number;
    revisionRequired: number;
    insufficientData: number;
    blocked: number;
    totalValidations: number;
  };
  reviews: {
    pendingReviews: number;
    underReview: number;
    approved: number;
    rejected: number;
    revisionRequested: number;
    totalReviews: number;
  };
  deliveries: {
    totalAttempts: number;
    mockDeliveries: number;
    draftOnlyRecords: number;
    successfulMockDeliveries: number;
    failedAttempts: number;
    blockedAttempts: number;
    duplicateAttemptsPrevented: number;
    deliverySuccessRate: number;
  };
  timestamp: string;
}

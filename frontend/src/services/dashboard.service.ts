import { AuthService } from './auth.service';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export interface DashboardOverview {
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

export class DashboardService {
  private static getHeaders(): Record<string, string> {
    const token = AuthService.getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  static async getOverview(): Promise<DashboardOverview> {
    const res = await fetch(`${API_BASE_URL}/dashboard/overview`, {
      headers: this.getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch executive overview');
    return json.data;
  }
}

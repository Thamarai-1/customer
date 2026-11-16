import { AuthService } from './auth.service';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export type CustomerSegmentType =
  | 'CONSISTENT_CUSTOMER'
  | 'LOYALTY_CANDIDATE'
  | 'DECLINING_ACTIVITY'
  | 'INACTIVE'
  | 'OVERDUE_BILL';

export type ClassificationStatus = 'CLASSIFIED' | 'INSUFFICIENT_DATA' | 'UNCLASSIFIED';

export interface SegmentationEvidence {
  lastActivityDate: string | null;
  daysSinceLastActivity: number | null;
  activityCount30d: number;
  activityCountPrevious30d: number;
  activityReductionPercent: number | null;
  lifetimeActivityCount: number;
  loyaltyTier: string;
  loyaltyPoints: number;
  membershipDurationDays: number;
  activePlan: string;
  planStatus: string;
  planType: string;
  totalInvoiced: number;
  totalOutstandingAmount: number;
  overdueInvoiceCount: number;
  oldestOverdueDays: number;
  oldestOverdueInvoiceId: string | null;
  overdueInvoiceIds: string[];
  disputeCount: number;
  hasDisputedInvoices: boolean;
  hasNonDisputedOverdue: boolean;
  hasActivityData: boolean;
  hasBillingData: boolean;
  hasSubscriptionData: boolean;
}

export interface CustomerClassificationItem {
  id: string;
  customerId: string;
  customerName: string;
  email: string;
  customerType: string;
  accountStatus: string;
  primarySegment: CustomerSegmentType | null;
  segments: CustomerSegmentType[];
  classificationStatus: ClassificationStatus;
  confidence: number;
  reasonCodes: string[];
  explanations: string[];
  evidence: SegmentationEvidence;
  ruleVersion: string;
  classifiedAt: string;
}

export interface SegmentationStatistics {
  totalCustomers: number;
  classifiedCustomers: number;
  unclassifiedCustomers: number;
  insufficientDataCustomers: number;
  multiSegmentCustomers: number;
  segmentCounts: Record<CustomerSegmentType, number>;
  segmentPercentages: Record<CustomerSegmentType, number>;
  primarySegmentCounts: Record<CustomerSegmentType, number>;
  lastRunTimestamp: string | null;
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

export interface SegmentationConfig {
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
  updatedAt?: string;
  notes?: string;
}

export interface SegmentDefinition {
  segmentKey: CustomerSegmentType;
  name: string;
  description: string;
  priority: number;
}

export class SegmentationService {
  private static getHeaders(): HeadersInit {
    const token = AuthService.getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  static async getStatistics(): Promise<SegmentationStatistics> {
    const res = await fetch(`${API_BASE_URL}/segmentation/statistics`, {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: 'include'
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to fetch segmentation statistics');
    }
    return json.data;
  }

  static async getSegmentDefinitions(): Promise<SegmentDefinition[]> {
    const res = await fetch(`${API_BASE_URL}/segmentation/segments`, {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: 'include'
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to fetch segment definitions');
    }
    return json.data;
  }

  static async getSegmentCustomers(
    segmentName: CustomerSegmentType | 'ALL',
    page = 1,
    limit = 20,
    filters: {
      search?: string;
      primarySegment?: string;
      status?: string;
      minConfidence?: number;
    } = {}
  ): Promise<{
    classifications: CustomerClassificationItem[];
    meta: {
      page: number;
      limit: number;
      totalRecords: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit)
    });

    if (filters.search) params.append('search', filters.search);
    if (filters.primarySegment) params.append('primarySegment', filters.primarySegment);
    if (filters.status) params.append('status', filters.status);
    if (filters.minConfidence !== undefined) params.append('minConfidence', String(filters.minConfidence));

    const res = await fetch(`${API_BASE_URL}/segmentation/segments/${segmentName}/customers?${params.toString()}`, {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: 'include'
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to fetch segment customers');
    }

    return {
      classifications: json.data || [],
      meta: json.meta || {
        page,
        limit,
        totalRecords: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      }
    };
  }

  static async getCustomerClassification(customerId: string): Promise<CustomerClassificationItem> {
    const res = await fetch(`${API_BASE_URL}/segmentation/customers/${customerId}`, {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: 'include'
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to fetch customer classification');
    }
    return json.data;
  }

  static async classifyCustomer(customerId: string): Promise<CustomerClassificationItem> {
    const res = await fetch(`${API_BASE_URL}/segmentation/customers/${customerId}/classify`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include'
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to classify customer');
    }
    return json.data;
  }

  static async classifyAll(batchSize = 100): Promise<ClassifyAllSummary> {
    const res = await fetch(`${API_BASE_URL}/segmentation/classify-all`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ batchSize }),
      credentials: 'include'
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to run batch classification');
    }
    return json.data;
  }

  static async getConfig(): Promise<SegmentationConfig> {
    const res = await fetch(`${API_BASE_URL}/segmentation/config`, {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: 'include'
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to fetch segmentation configuration');
    }
    return json.data;
  }

  static async updateConfig(updates: Partial<SegmentationConfig>): Promise<SegmentationConfig> {
    const res = await fetch(`${API_BASE_URL}/segmentation/config`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
      credentials: 'include'
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to update segmentation configuration');
    }
    return json.data;
  }
}

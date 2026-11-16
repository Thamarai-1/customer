import { AuthService } from './auth.service';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export interface CampaignItem {
  _id: string;
  campaignCode: string;
  name: string;
  description: string;
  objective: string;
  targetSegments: string[];
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'ARCHIVED';
  startDate: string;
  endDate: string;
  allowedChannels: string[];
  offerIds: Array<{ _id: string; offerCode: string; name: string } | string>;
  priority: number;
  toneGuideline?: string;
  mandatoryDisclaimers?: string[];
  blockedKeywords?: string[];
  totalTargetedCustomers: number;
  createdAt: string;
}

export interface OfferItem {
  _id: string;
  offerCode: string;
  name: string;
  description: string;
  offerType: string;
  value: number;
  valueType: string;
  currency: string | null;
  targetSegments: string[];
  eligibilityRules: {
    minimumLoyaltyPoints?: number;
    minimumMembershipDays?: number;
    requiredLoyaltyTiers?: string[];
    requiredAccountStatus?: string;
    requiredPlanStatus?: string;
    requiredPlanType?: string;
    maxOverdueBalance?: number;
    maxDaysOverdue?: number;
  };
  validFrom: string;
  validUntil: string;
  allowedChannels: string[];
  termsAndConditions: string[];
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'DEPLETED';
  maxRedemptions: number;
  currentRedemptions: number;
  createdAt: string;
}

export interface OfferEligibilityEvaluationResult {
  customerId: string;
  offerId: string;
  offerCode: string;
  eligible: boolean;
  status: 'ELIGIBLE' | 'INELIGIBLE' | 'INSUFFICIENT_DATA';
  reasonCodes: string[];
  passedConditions: string[];
  failedConditions: Array<{
    rule: string;
    required: unknown;
    actual: unknown;
    reason: string;
  }>;
  validatedAt: string;
}

export interface PolicyEvaluationReport {
  evaluationId?: string;
  customerId: string;
  evaluatedAt: string;
  customerSummary: {
    customerId: string;
    fullName: string;
    email: string;
    accountStatus: string;
    loyaltyTier: string;
    loyaltyPoints: number;
    activePlan: string;
    planStatus: string;
    membershipDays: number;
  };
  strategy: {
    primarySegment: string;
    secondarySegments: string[];
    primaryObjective: string;
    recommendedTone: string;
    alternativeTones: string[];
    recommendedActions: string[];
    priorityLevel: number;
    suppressPromotions: boolean;
    reasoning: string[];
  };
  campaigns: {
    matchedActiveCampaigns: Array<{
      campaignId: string;
      campaignCode: string;
      name: string;
      objective: string;
      targetSegments: string[];
      validUntil: string;
    }>;
  };
  offers: {
    eligibleOffers: OfferEligibilityEvaluationResult[];
    ineligibleOffers: OfferEligibilityEvaluationResult[];
  };
  billing: {
    highestStage: string;
    requiresHumanReview: boolean;
    hasDisputedInvoices: boolean;
    totalOutstandingByCurrency: Record<string, number>;
    totalOverdueByCurrency: Record<string, number>;
    summaryMessage: string;
    recommendedAction: string;
    invoices: Array<{
      invoiceId: string;
      invoiceAmount: number;
      outstandingAmount: number;
      currency: string;
      dueDate: string;
      daysOverdue: number;
      stage: string;
      isDisputed: boolean;
      recommendedAction: string;
    }>;
    disputedInvoices: Array<{
      invoiceId: string;
      outstandingAmount: number;
      currency: string;
      disputeReason?: string;
    }>;
  };
  channelConsent: {
    preferredChannel: string;
    optedOut: boolean;
    emailConsent: boolean;
    smsConsent: boolean;
    whatsappConsent: boolean;
    isEligibleForOutreach: boolean;
    outreachWarning?: string;
  };
  recommendation: {
    primaryAction: string;
    recommendedCampaignId?: string;
    recommendedCampaignName?: string;
    primaryOfferCode?: string;
    primaryOfferName?: string;
    billingReminderStage: string;
    requiresHumanReview: boolean;
    communicationTone: string;
    targetObjective: string;
    messageGenerationContext: {
      customerSegment: string;
      objective: string;
      tone: string;
      offerDetails?: {
        code: string;
        name: string;
        value: number;
        valueType: string;
        terms: string[];
      };
      billingDetails?: {
        stage: string;
        totalOverdueByCurrency: Record<string, number>;
        requiresHumanReview: boolean;
      };
    };
  };
}

export class PolicyApiClient {
  private static getHeaders(): Record<string, string> {
    const token = AuthService.getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  // --- Campaign Methods ---
  static async listCampaigns(params: {
    page?: number;
    limit?: number;
    status?: string;
    targetSegment?: string;
    search?: string;
  } = {}): Promise<{ campaigns: CampaignItem[]; meta: { totalRecords: number; totalPages: number } }> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.status) query.set('status', params.status);
    if (params.targetSegment) query.set('targetSegment', params.targetSegment);
    if (params.search) query.set('search', params.search);

    const res = await fetch(`${API_BASE_URL}/campaigns?${query.toString()}`, {
      headers: this.getHeaders()
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch campaigns');
    }

    return {
      campaigns: data.data || [],
      meta: data.meta || { totalRecords: 0, totalPages: 1 }
    };
  }

  static async createCampaign(payload: Record<string, unknown>): Promise<CampaignItem> {
    const res = await fetch(`${API_BASE_URL}/campaigns`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to create campaign');
    }
    return data.data;
  }

  static async updateCampaignStatus(campaignId: string, status: string): Promise<CampaignItem> {
    const res = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ status })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to update campaign status');
    }
    return data.data;
  }

  // --- Offer Methods ---
  static async listOffers(params: {
    page?: number;
    limit?: number;
    status?: string;
    offerType?: string;
    targetSegment?: string;
    search?: string;
  } = {}): Promise<{ offers: OfferItem[]; meta: { totalRecords: number; totalPages: number } }> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.status) query.set('status', params.status);
    if (params.offerType) query.set('offerType', params.offerType);
    if (params.targetSegment) query.set('targetSegment', params.targetSegment);
    if (params.search) query.set('search', params.search);

    const res = await fetch(`${API_BASE_URL}/offers?${query.toString()}`, {
      headers: this.getHeaders()
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch offers');
    }

    return {
      offers: data.data || [],
      meta: data.meta || { totalRecords: 0, totalPages: 1 }
    };
  }

  static async createOffer(payload: Record<string, unknown>): Promise<OfferItem> {
    const res = await fetch(`${API_BASE_URL}/offers`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to create offer');
    }
    return data.data;
  }

  static async updateOfferStatus(offerId: string, status: string): Promise<OfferItem> {
    const res = await fetch(`${API_BASE_URL}/offers/${offerId}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ status })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to update offer status');
    }
    return data.data;
  }

  static async evaluateOfferEligibility(
    offerId: string,
    customerId: string,
    channel = 'EMAIL'
  ): Promise<OfferEligibilityEvaluationResult> {
    const res = await fetch(
      `${API_BASE_URL}/offers/${offerId}/evaluate/${customerId}?channel=${channel}`,
      {
        method: 'POST',
        headers: this.getHeaders()
      }
    );

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to evaluate offer eligibility');
    }
    return data.data;
  }

  // --- Central Policy Engine ---
  static async evaluateCustomerPolicy(
    customerId: string,
    channel = 'EMAIL'
  ): Promise<PolicyEvaluationReport> {
    const res = await fetch(
      `${API_BASE_URL}/policy-engine/customers/${customerId}/evaluate?channel=${channel}`,
      {
        method: 'POST',
        headers: this.getHeaders()
      }
    );

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to evaluate customer policy');
    }
    return data.data;
  }

  static async getLatestPolicyEvaluation(customerId: string): Promise<PolicyEvaluationReport | null> {
    const res = await fetch(`${API_BASE_URL}/policy-engine/customers/${customerId}/latest`, {
      headers: this.getHeaders()
    });

    if (res.status === 404) {
      return null;
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch latest policy evaluation');
    }
    return data.data;
  }
}

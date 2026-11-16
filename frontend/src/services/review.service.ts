import { AuthService } from './auth.service';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export type ReviewStatus =
  | 'PENDING_REVIEW'
  | 'UNDER_REVIEW'
  | 'REVISION_REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type ReviewActionType =
  | 'START_REVIEW'
  | 'EDIT'
  | 'REQUEST_REVISION'
  | 'REGENERATE'
  | 'REVALIDATE'
  | 'APPROVE'
  | 'REJECT'
  | 'CANCEL'
  | 'ASSIGN_REVIEWER';

export type MessageVersionSource =
  | 'AI_GENERATED'
  | 'HUMAN_EDITED'
  | 'AI_REGENERATED';

export type RejectionReasonCode =
  | 'INCORRECT_FACTS'
  | 'UNAPPROVED_OFFER'
  | 'INAPPROPRIATE_TONE'
  | 'POLICY_VIOLATION'
  | 'COMPLIANCE_NON_COMPLIANT'
  | 'CUSTOMER_OPTED_OUT'
  | 'DUPLICATE_COMMUNICATION'
  | 'OTHER';

export interface IMessageReview {
  _id: string;
  generatedMessageId: string;
  customerId: string;
  customerRef: string;
  currentMessageVersion: number;
  currentComplianceValidationId: string;
  status: ReviewStatus;
  assignedReviewerId?: string;
  assignedReviewerName?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewComments?: string;
  rejectionReason?: string;
  rejectionReasonCode?: RejectionReasonCode;
  warningAcknowledgements: string[];
  staleDataDetected: boolean;
  staleDataReason?: string;
  approvedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  customer?: {
    _id: string;
    customerId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    loyaltyTier: string;
    accountStatus: string;
    monthlySpend: number;
    totalSpend: number;
  };
  messageDraft?: {
    _id: string;
    channel: string;
    primarySegment: string;
    objective: string;
    subject: string;
    body: string;
    referencedOffers?: string[];
  };
  complianceReport?: {
    _id: string;
    overallStatus: string;
    decision: string;
    summary: {
      totalChecks: number;
      passed: number;
      failed: number;
      warnings: number;
    };
  };
}

export interface IMessageVersion {
  _id: string;
  generatedMessageId: string;
  reviewId: string;
  version: number;
  subject: string;
  body: string;
  source: MessageVersionSource;
  editedBy?: string;
  editedByName?: string;
  editReason?: string;
  complianceValidationId?: string;
  createdAt: string;
}

export interface IReviewAction {
  _id: string;
  reviewId: string;
  generatedMessageId: string;
  messageVersion: number;
  reviewerId: string;
  reviewerName: string;
  action: ReviewActionType;
  comments?: string;
  previousStatus?: string;
  newStatus?: string;
  complianceValidationId?: string;
  warningAcknowledgements?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ReviewDashboardStats {
  totalPendingReviews: number;
  currentlyUnderReview: number;
  approvedMessages: number;
  rejectedMessages: number;
  revisionRequested: number;
  messagesWithComplianceWarnings: number;
  messagesBlockedByCompliance: number;
  averageReviewTimeHours?: number;
}

export interface ReviewWorkspaceDetail {
  review: IMessageReview;
  message: {
    _id: string;
    customerId: string;
    channel: string;
    primarySegment: string;
    objective: string;
    subject: string;
    body: string;
    referencedOffers: string[];
    referencedBillingFacts: string[];
    evidenceSnapshot: Record<string, unknown>;
    provider: string;
    model: string;
    promptVersion: string;
  };
  customer: {
    _id: string;
    customerId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    accountStatus: string;
    loyaltyTier: string;
    planType: string;
    monthlySpend: number;
    totalSpend: number;
  };
  preferences?: {
    emailConsent: boolean;
    smsConsent: boolean;
    whatsappConsent: boolean;
    preferredChannel: string;
    optedOut: boolean;
  };
  billingRecords?: Array<{
    invoiceId: string;
    invoiceAmount: number;
    amountDue: number;
    paymentStatus: string;
    dueDate: string;
    disputeStatus: string;
  }>;
  policyReport?: {
    _id: string;
    strategy: {
      strategyName: string;
      engagementType: string;
      toneGuidelines: string;
    };
    offers: Array<{
      offerCode: string;
      name: string;
      description: string;
      value: number;
      valueType: string;
      validUntil: string;
    }>;
  };
  currentVersion: IMessageVersion;
  versions: IMessageVersion[];
  complianceReport: {
    _id: string;
    overallStatus: string;
    decision: string;
    summary: {
      totalChecks: number;
      passed: number;
      failed: number;
      warnings: number;
      skipped: number;
      insufficientData: number;
    };
    checks: Array<{
      checkId: string;
      checkName: string;
      status: string;
      severity: string;
      message: string;
      findings: Array<{
        ruleId: string;
        checkId: string;
        severity: string;
        reasonCode: string;
        message: string;
        recommendedAction: string;
      }>;
    }>;
    findings: Array<{
      ruleId: string;
      checkId: string;
      severity: string;
      reasonCode: string;
      message: string;
      recommendedAction: string;
    }>;
  };
  actions: IReviewAction[];
}

export class ReviewService {
  private static getHeaders(): HeadersInit {
    const token = AuthService.getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  static async listReviews(params: {
    page?: number;
    limit?: number;
    status?: string;
    channel?: string;
    segment?: string;
    reviewerId?: string;
    search?: string;
  } = {}): Promise<{ reviews: IMessageReview[]; meta: any }> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.status) query.set('status', params.status);
    if (params.channel) query.set('channel', params.channel);
    if (params.segment) query.set('segment', params.segment);
    if (params.reviewerId) query.set('reviewerId', params.reviewerId);
    if (params.search) query.set('search', params.search);

    const res = await fetch(`${API_BASE_URL}/reviews?${query.toString()}`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.message || 'Failed to list reviews');
    return { reviews: data.data || [], meta: data.meta };
  }

  static async getDashboardStats(): Promise<ReviewDashboardStats> {
    const res = await fetch(`${API_BASE_URL}/reviews/dashboard/stats`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.message || 'Failed to fetch review dashboard stats');
    return data.data;
  }

  static async getReviewDetails(reviewId: string): Promise<ReviewWorkspaceDetail> {
    const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.message || 'Failed to fetch review workspace');
    return data.data;
  }

  static async startReview(reviewId: string): Promise<IMessageReview> {
    const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}/start`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.message || 'Failed to start review');
    return data.data;
  }

  static async editMessage(
    reviewId: string,
    payload: { subject: string; body: string; editReason?: string }
  ): Promise<{ review: IMessageReview; newVersion: IMessageVersion; validationReport: any }> {
    const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}/edit`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.message || 'Failed to edit message');
    return data.data;
  }

  static async regenerateMessage(
    reviewId: string,
    payload: { reason?: string; provider?: string; modelOverride?: string } = {}
  ): Promise<{ review: IMessageReview; newVersion: IMessageVersion; validationReport: any }> {
    const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}/regenerate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.message || 'Failed to regenerate message');
    return data.data;
  }

  static async validateReviewMessage(reviewId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}/validate`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.message || 'Failed to validate message');
    return data.data;
  }

  static async approveReview(
    reviewId: string,
    payload: {
      messageVersion: number;
      complianceValidationId: string;
      warningAcknowledgements?: string[];
      comments?: string;
    }
  ): Promise<IMessageReview> {
    const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}/approve`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.message || 'Failed to approve message');
    return data.data;
  }

  static async rejectReview(
    reviewId: string,
    payload: {
      rejectionReasonCode: RejectionReasonCode;
      rejectionReason: string;
      comments?: string;
    }
  ): Promise<IMessageReview> {
    const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}/reject`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.message || 'Failed to reject message');
    return data.data;
  }

  static async requestRevision(
    reviewId: string,
    payload: { comments: string }
  ): Promise<IMessageReview> {
    const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}/request-revision`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.message || 'Failed to request revision');
    return data.data;
  }

  static async assignReviewer(
    reviewId: string,
    payload: { reviewerId: string }
  ): Promise<IMessageReview> {
    const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}/assign`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.message || 'Failed to assign reviewer');
    return data.data;
  }

  static async getVersions(reviewId: string): Promise<IMessageVersion[]> {
    const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}/versions`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.message || 'Failed to fetch version history');
    return data.data;
  }

  static async getHistory(reviewId: string): Promise<IReviewAction[]> {
    const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}/history`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.message || 'Failed to fetch review history');
    return data.data;
  }
}

import { AuthService } from './auth.service';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export type CheckStatus = 'PASSED' | 'WARNING' | 'FAILED' | 'INSUFFICIENT_DATA';
export type SeverityLevel = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RecommendedAction =
  | 'NONE'
  | 'REVIEW_REQUIRED'
  | 'REGENERATE'
  | 'EDIT_REQUIRED'
  | 'BLOCK_MESSAGE'
  | 'ESCALATE_TO_HUMAN';
export type OverallComplianceDecision =
  | 'PASS'
  | 'PASS_WITH_WARNINGS'
  | 'REVISION_REQUIRED'
  | 'INSUFFICIENT_DATA'
  | 'BLOCKED';

export interface IValidationFinding {
  ruleId: string;
  checkId: string;
  severity: SeverityLevel;
  reasonCode: string;
  message: string;
  evidenceValue?: string;
  generatedValue?: string;
  recommendedAction: RecommendedAction;
}

export interface IValidationCheckResult {
  checkId: string;
  checkName: string;
  status: CheckStatus;
  severity: SeverityLevel;
  reasonCode?: string;
  message: string;
  findings: IValidationFinding[];
  evidence: Record<string, unknown>;
  recommendedAction: RecommendedAction;
  durationMs: number;
}

export interface IComplianceSummary {
  totalChecks: number;
  passed: number;
  warnings: number;
  failed: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
}

export interface IComplianceReport {
  _id: string;
  messageId: string | any;
  customerId: string;
  customerRef?: string | any;
  policyEvaluationId?: string;
  overallStatus: OverallComplianceDecision;
  decision: OverallComplianceDecision;
  summary: IComplianceSummary;
  checks: IValidationCheckResult[];
  findings: IValidationFinding[];
  policyVersion: string;
  validatorVersions: Record<string, string>;
  validatedAt: string;
  createdAt: string;
}

export interface IComplianceStatistics {
  totalValidations: number;
  passed: number;
  passedWithWarnings: number;
  revisionRequired: number;
  blocked: number;
  insufficientData: number;
  successRate: number;
  mostCommonFailures: Array<{ reasonCode: string; count: number }>;
}

export interface ICompliancePolicyConfig {
  version: string;
  isActive: boolean;
  frequencyLimits: {
    maxDailyMarketingEmails: number;
    maxWeeklyMarketingEmails: number;
    minIntervalHoursMarketing: number;
    maxBillingRemindersPerMonth: number;
  };
  blockedPhrases: string[];
  requiredDisclaimers: {
    offerTermsText: string;
    billingDisputeText: string;
    supportContactText: string;
  };
  duplicateWindowHours: number;
  updatedBy?: string;
  updatedAt?: string;
}

export class ComplianceService {
  private static getHeaders(): Record<string, string> {
    const token = AuthService.getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  static async validateMessage(messageId: string): Promise<IComplianceReport> {
    const res = await fetch(`${API_BASE_URL}/compliance/messages/${messageId}/validate`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.message || 'Failed to execute compliance validation');
    }
    return data.data;
  }

  static async getLatestReport(messageId: string): Promise<IComplianceReport | null> {
    const res = await fetch(`${API_BASE_URL}/compliance/messages/${messageId}/latest`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(data?.message || 'Failed to retrieve latest compliance report');
    }
    return data.data;
  }

  static async getValidationHistory(
    messageId: string,
    page = 1,
    limit = 10
  ): Promise<{ reports: IComplianceReport[]; meta: any }> {
    const res = await fetch(
      `${API_BASE_URL}/compliance/messages/${messageId}/history?page=${page}&limit=${limit}`,
      { headers: this.getHeaders() }
    );
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.message || 'Failed to retrieve validation history');
    }
    return { reports: data.data, meta: data.meta };
  }

  static async getReportById(reportId: string): Promise<IComplianceReport> {
    const res = await fetch(`${API_BASE_URL}/compliance/reports/${reportId}`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.message || 'Failed to retrieve compliance report');
    }
    return data.data;
  }

  static async validateCustomerDrafts(
    customerId: string,
    page = 1,
    limit = 10
  ): Promise<{ results: IComplianceReport[]; meta: any }> {
    const res = await fetch(
      `${API_BASE_URL}/compliance/customers/${customerId}/validate-drafts?page=${page}&limit=${limit}`,
      {
        method: 'POST',
        headers: this.getHeaders()
      }
    );
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.message || 'Failed to validate customer drafts');
    }
    return { results: data.data, meta: data.meta };
  }

  static async getConfig(): Promise<ICompliancePolicyConfig> {
    const res = await fetch(`${API_BASE_URL}/compliance/config`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.message || 'Failed to retrieve compliance policy configuration');
    }
    return data.data;
  }

  static async updateConfig(
    updates: Partial<ICompliancePolicyConfig>
  ): Promise<ICompliancePolicyConfig> {
    const res = await fetch(`${API_BASE_URL}/compliance/config`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.message || 'Failed to update compliance policy configuration');
    }
    return data.data;
  }

  static async getStatistics(): Promise<IComplianceStatistics> {
    const res = await fetch(`${API_BASE_URL}/compliance/statistics`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.message || 'Failed to retrieve compliance statistics');
    }
    return data.data;
  }

  static async getBlockedMessages(
    page = 1,
    limit = 10,
    filters: { customerId?: string; reasonCode?: string } = {}
  ): Promise<{ reports: IComplianceReport[]; meta: any }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.customerId) params.append('customerId', filters.customerId);
    if (filters.reasonCode) params.append('reasonCode', filters.reasonCode);

    const res = await fetch(`${API_BASE_URL}/compliance/blocked-messages?${params.toString()}`, {
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.message || 'Failed to retrieve blocked messages');
    }
    return { reports: data.data, meta: data.meta };
  }
}

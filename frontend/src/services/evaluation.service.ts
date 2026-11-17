import { AuthService } from './auth.service';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export interface SegmentMetrics {
  segment: string;
  precision: number;
  recall: number;
  f1Score: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  support: number;
}

export interface ComprehensiveEvaluationReport {
  metadata: {
    reportId: string;
    generatedAt: string;
    datasetDescription: string;
    evaluationPeriod: string;
    limitations: string[];
  };
  segmentation: {
    totalEvaluated: number;
    overallAccuracy: number;
    macroF1: number;
    segments: SegmentMetrics[];
    confusionMatrix: {
      labels: string[];
      matrix: number[][];
    };
    explanation: string;
  };
  messageGeneration: {
    totalRequests: number;
    successfulGenerations: number;
    generationSuccessRate: number;
    generationFailureRate: number;
    averageLatencyMs: number;
    providerLatencies: Record<string, number>;
    schemaValidationPassRate: number;
    groundingValidationPassRate: number;
    regenerationFrequency: number;
  };
  compliance: {
    totalValidations: number;
    passRate: number;
    warningRate: number;
    revisionRequiredRate: number;
    insufficientDataRate: number;
    blockRate: number;
    validatorDistribution: Record<string, number>;
    injectedViolationDetectionRate: number;
    validCasesFalsePositiveRate: number;
  };
  humanReview: {
    totalReviews: number;
    approvalRate: number;
    rejectionRate: number;
    revisionRequestRate: number;
    averageReviewTimeMinutes: number;
    editRate: number;
    regenerationRate: number;
  };
  delivery: {
    totalDeliveryAttempts: number;
    mockSuccessRate: number;
    draftOnlyCount: number;
    blockedCount: number;
    failedCount: number;
    duplicatesPrevented: number;
  };
}

export class EvaluationService {
  private static getHeaders(): Record<string, string> {
    const token = AuthService.getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  static async getOverview(): Promise<ComprehensiveEvaluationReport> {
    const res = await fetch(`${API_BASE_URL}/evaluation/overview`, {
      headers: this.getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch evaluation report');
    return json.data;
  }

  static async getSegmentationEvaluation(): Promise<ComprehensiveEvaluationReport['segmentation']> {
    const res = await fetch(`${API_BASE_URL}/evaluation/segmentation`, {
      headers: this.getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch segmentation evaluation');
    return json.data;
  }

  static async exportReport(format: 'json' | 'csv'): Promise<Blob> {
    const res = await fetch(`${API_BASE_URL}/evaluation/report?format=${format}`, {
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to export evaluation report');
    return await res.blob();
  }
}

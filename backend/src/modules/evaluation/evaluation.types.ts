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

export interface SegmentationEvaluation {
  totalEvaluated: number;
  overallAccuracy: number;
  macroF1: number;
  segments: SegmentMetrics[];
  confusionMatrix: {
    labels: string[];
    matrix: number[][]; // [actualIndex][predictedIndex]
  };
  explanation: string;
}

export interface GenerationEvaluation {
  totalRequests: number;
  successfulGenerations: number;
  generationSuccessRate: number;
  generationFailureRate: number;
  averageLatencyMs: number;
  providerLatencies: Record<string, number>;
  schemaValidationPassRate: number;
  groundingValidationPassRate: number;
  regenerationFrequency: number;
}

export interface ComplianceEvaluation {
  totalValidations: number;
  passRate: number;
  warningRate: number;
  revisionRequiredRate: number;
  insufficientDataRate: number;
  blockRate: number;
  validatorDistribution: Record<string, number>;
  injectedViolationDetectionRate: number;
  validCasesFalsePositiveRate: number;
}

export interface HumanReviewEvaluation {
  totalReviews: number;
  approvalRate: number;
  rejectionRate: number;
  revisionRequestRate: number;
  averageReviewTimeMinutes: number;
  editRate: number;
  regenerationRate: number;
}

export interface DeliveryEvaluation {
  totalDeliveryAttempts: number;
  mockSuccessRate: number;
  draftOnlyCount: number;
  blockedCount: number;
  failedCount: number;
  duplicatesPrevented: number;
}

export interface ComprehensiveEvaluationReport {
  metadata: {
    reportId: string;
    generatedAt: string;
    datasetDescription: string;
    evaluationPeriod: string;
    limitations: string[];
  };
  segmentation: SegmentationEvaluation;
  messageGeneration: GenerationEvaluation;
  compliance: ComplianceEvaluation;
  humanReview: HumanReviewEvaluation;
  delivery: DeliveryEvaluation;
}

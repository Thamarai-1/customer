export interface ScenarioStepResult {
  step: string;
  status: 'PENDING' | 'SUCCESS' | 'BLOCKED' | 'FAILED';
  summary: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface ScenarioRunResult {
  scenarioId: string;
  name: string;
  customerId: string;
  status: 'COMPLETED' | 'BLOCKED' | 'FAILED';
  steps: ScenarioStepResult[];
  generatedMessageId?: string;
  reviewId?: string;
  complianceValidationId?: string;
  deliveryId?: string;
  durationMs: number;
}

export interface RefusalRunResult {
  refusalId: string;
  name: string;
  blockedAsExpected: boolean;
  blockReason: string;
  errorCode: string;
  blockStage: string;
  evidence: Record<string, unknown>;
  timestamp: string;
}

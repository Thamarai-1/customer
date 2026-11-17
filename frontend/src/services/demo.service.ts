import { AuthService } from './auth.service';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export interface ScenarioItem {
  id: string;
  name: string;
  customerId: string;
  customerName: string;
  expectedSegment: string;
  objective: string;
  deliveryMode: string;
  description: string;
  customerExists: boolean;
  currentStage: string;
  generatedMessageId?: string;
  reviewStatus?: string;
  deliveryStatus?: string;
}

export interface RefusalItem {
  id: string;
  name: string;
  description: string;
  expectedBlockStage: string;
}

export interface ScenarioStep {
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
  steps: ScenarioStep[];
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

export class DemoService {
  private static getHeaders(): Record<string, string> {
    const token = AuthService.getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  static async getScenariosState(): Promise<{
    scenarios: ScenarioItem[];
    refusals: RefusalItem[];
  }> {
    const res = await fetch(`${API_BASE_URL}/demo/scenarios`, {
      headers: this.getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch demo scenarios');
    return json.data;
  }

  static async runScenario(scenarioId: string): Promise<ScenarioRunResult> {
    const res = await fetch(`${API_BASE_URL}/demo/scenarios/${scenarioId}/run`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || `Failed to run scenario ${scenarioId}`);
    return json.data;
  }

  static async resetScenario(scenarioId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/demo/scenarios/${scenarioId}/reset`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || `Failed to reset scenario ${scenarioId}`);
  }

  static async runRefusal(refusalId: string): Promise<RefusalRunResult> {
    const res = await fetch(`${API_BASE_URL}/demo/refusals/${refusalId}/run`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || `Failed to run refusal demo ${refusalId}`);
    return json.data;
  }

  static async resetAllDemoData(): Promise<string> {
    const res = await fetch(`${API_BASE_URL}/demo/reset-all`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to reset demo dataset');
    return json.message;
  }
}

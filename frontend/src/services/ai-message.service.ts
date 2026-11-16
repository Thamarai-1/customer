import { AuthService } from './auth.service';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export interface GroundingFinding {
  rule: string;
  severity: 'ERROR' | 'WARNING';
  message: string;
  evidenceValue?: string;
  generatedValue?: string;
}

export interface GeneratedMessageItem {
  _id: string;
  customerId: string;
  customerRef: string;
  policyEvaluationId?: string;
  campaignRef?: string;
  primarySegment: string;
  objective: string;
  channel: string;
  subject: string;
  body: string;
  referencedOffers: string[];
  referencedBillingFacts: string[];
  generationStatus: 'GENERATED' | 'GROUNDING_FAILED' | 'FAILED' | 'REFUSED';
  groundingStatus: 'PASSED' | 'FAILED' | 'FLAGGED';
  validationFindings: GroundingFinding[];
  provider: string;
  model: string;
  promptVersion: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  retryCount: number;
  refusalReason?: string;
  generatedAt: string;
  createdAt: string;
}

export interface GenerateMessageRequest {
  channel?: string;
  provider?: 'OPENAI' | 'GEMINI' | 'ANTHROPIC';
  model?: string;
}

export interface RegenerateMessageRequest {
  reason?: string;
  provider?: 'OPENAI' | 'GEMINI' | 'ANTHROPIC';
  model?: string;
}

export interface AIProviderInfo {
  provider: 'OPENAI' | 'GEMINI' | 'ANTHROPIC';
  defaultModel: string;
  isConfigured: boolean;
  supportedModels: string[];
}

export interface MessageGenerationConfig {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  retryLimit: number;
}

export interface GenerationContextPreview {
  evidenceContext: {
    customer: {
      firstName: string;
      activePlan: string;
      loyaltyTier: string;
      loyaltyPoints: number;
      membershipDurationDays: number;
    };
    classification: {
      primarySegment: string;
      segments: string[];
      reasonCodes: string[];
    };
    policyDecision: {
      objective: string;
      tone: string;
      alternativeTones: string[];
      recommendedActions: string[];
      suppressPromotions: boolean;
    };
    campaign?: {
      campaignCode: string;
      name: string;
      description: string;
    };
    eligibleOffers: Array<{
      offerCode: string;
      name: string;
      value: number;
      valueType: string;
    }>;
    billing?: {
      overdueInvoicesCount: number;
      primaryCurrency: string;
      totalOverdueByCurrency: Record<string, number>;
      reminderStage?: string;
    };
    communication: {
      channel: string;
      consentGranted: boolean;
    };
  };
  selectedPrompt?: {
    templateName: string;
    promptVersion: string;
    systemPrompt: string;
    userPrompt: string;
  };
  preconditionsPassed: boolean;
  refusalReason?: string;
}

export class AIMessageService {
  private static getHeaders(): Record<string, string> {
    const token = AuthService.getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  static async generateDraft(
    customerId: string,
    payload: GenerateMessageRequest = {}
  ): Promise<GeneratedMessageItem> {
    const res = await fetch(`${API_BASE_URL}/message-generation/customers/${customerId}/generate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.message || 'Failed to generate message draft');
    }
    return data.data;
  }

  static async getDraftById(messageId: string): Promise<GeneratedMessageItem> {
    const res = await fetch(`${API_BASE_URL}/message-generation/${messageId}`, {
      headers: this.getHeaders()
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.message || 'Failed to retrieve message draft');
    }
    return data.data;
  }

  static async listCustomerDrafts(
    customerId: string,
    page = 1,
    limit = 10
  ): Promise<{ messages: GeneratedMessageItem[]; meta: { totalRecords: number; totalPages: number } }> {
    const res = await fetch(
      `${API_BASE_URL}/message-generation/customers/${customerId}?page=${page}&limit=${limit}`,
      {
        headers: this.getHeaders()
      }
    );

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.message || 'Failed to list drafts');
    }
    return {
      messages: data.data || [],
      meta: data.meta || { totalRecords: 0, totalPages: 1 }
    };
  }

  static async regenerateDraft(
    messageId: string,
    payload: RegenerateMessageRequest = {}
  ): Promise<GeneratedMessageItem> {
    const res = await fetch(`${API_BASE_URL}/message-generation/${messageId}/regenerate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.message || 'Failed to regenerate draft');
    }
    return data.data;
  }

  static async previewContext(
    customerId: string,
    channel = 'EMAIL'
  ): Promise<GenerationContextPreview> {
    const res = await fetch(
      `${API_BASE_URL}/message-generation/customers/${customerId}/context?channel=${channel}`,
      {
        headers: this.getHeaders()
      }
    );

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.message || 'Failed to preview generation context');
    }
    return data.data;
  }

  static async getProviders(): Promise<AIProviderInfo[]> {
    const res = await fetch(`${API_BASE_URL}/ai/providers`, {
      headers: this.getHeaders()
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.message || 'Failed to fetch AI providers');
    }
    return data.data || [];
  }

  static async getConfig(): Promise<MessageGenerationConfig> {
    const res = await fetch(`${API_BASE_URL}/message-generation/config`, {
      headers: this.getHeaders()
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.message || 'Failed to retrieve AI configuration');
    }
    return data.data;
  }

  static async updateConfig(
    config: Partial<MessageGenerationConfig>
  ): Promise<MessageGenerationConfig> {
    const res = await fetch(`${API_BASE_URL}/message-generation/config`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(config)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.message || 'Failed to update AI configuration');
    }
    return data.data;
  }
}

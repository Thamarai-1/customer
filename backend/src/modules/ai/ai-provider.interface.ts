import { AIProviderType, AIRequest, AIResponse } from './ai-provider.types.js';

export interface IAIProvider {
  readonly providerName: AIProviderType;
  readonly defaultModel: string;

  isAvailable(): boolean;

  generateStructuredOutput<T>(
    request: AIRequest<T>,
    modelOverride?: string
  ): Promise<AIResponse<T>>;
}

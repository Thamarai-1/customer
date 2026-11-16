import { env } from '../../config/env.js';
import { AIProviderType, IMessageGenerationRuntimeConfig } from './ai-provider.types.js';

let runtimeConfig: IMessageGenerationRuntimeConfig = {
  defaultProvider: (env.AI_PROVIDER as AIProviderType) || AIProviderType.OPENAI,
  openaiModel: env.OPENAI_MODEL || 'gpt-4o-mini',
  geminiModel: env.GEMINI_MODEL || 'gemini-2.5-flash',
  anthropicModel: env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022',
  temperature: env.MESSAGE_GENERATION_TEMPERATURE ?? 0.3,
  maxTokens: env.MESSAGE_GENERATION_MAX_TOKENS ?? 1200,
  timeoutMs: env.MESSAGE_GENERATION_TIMEOUT_MS ?? 30000,
  retryLimit: env.MESSAGE_GENERATION_RETRY_LIMIT ?? 2,
  updatedAt: new Date(),
  updatedBy: 'SYSTEM'
};

export class AIProviderConfigService {
  static getRuntimeConfig(): IMessageGenerationRuntimeConfig {
    return { ...runtimeConfig };
  }

  static updateRuntimeConfig(
    updates: Partial<IMessageGenerationRuntimeConfig>,
    updatedBy = 'ADMIN'
  ): IMessageGenerationRuntimeConfig {
    runtimeConfig = {
      ...runtimeConfig,
      ...updates,
      updatedAt: new Date(),
      updatedBy
    };
    return { ...runtimeConfig };
  }

  static getEffectiveModel(provider: AIProviderType): string {
    switch (provider) {
      case AIProviderType.OPENAI:
        return runtimeConfig.openaiModel;
      case AIProviderType.GEMINI:
        return runtimeConfig.geminiModel;
      case AIProviderType.ANTHROPIC:
        return runtimeConfig.anthropicModel;
      default:
        return runtimeConfig.openaiModel;
    }
  }
}

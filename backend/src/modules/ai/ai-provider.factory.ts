import { IAIProvider } from './ai-provider.interface.js';
import { AIProviderType, ProviderStatusInfo } from './ai-provider.types.js';
import { AIProviderConfigService } from './ai-provider.config.js';
import { OpenAIProvider } from './providers/openai.provider.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { AnthropicProvider } from './providers/anthropic.provider.js';

export class AIProviderFactory {
  private static providers: Map<AIProviderType, IAIProvider> = new Map<AIProviderType, IAIProvider>([
    [AIProviderType.OPENAI, new OpenAIProvider()],
    [AIProviderType.GEMINI, new GeminiProvider()],
    [AIProviderType.ANTHROPIC, new AnthropicProvider()]
  ]);

  private static mockProviders: Map<AIProviderType, IAIProvider> = new Map();

  /**
   * Register a mock provider for automated unit testing.
   */
  static registerMockProvider(providerType: AIProviderType, mockProvider: IAIProvider): void {
    this.mockProviders.set(providerType, mockProvider);
  }

  /**
   * Reset mock providers.
   */
  static clearMockProviders(): void {
    this.mockProviders.clear();
  }

  /**
   * Resolve an AI provider instance.
   */
  static getProvider(requestedType?: AIProviderType): IAIProvider {
    const defaultType = AIProviderConfigService.getRuntimeConfig().defaultProvider;
    const type = requestedType || defaultType || AIProviderType.OPENAI;

    // Check mock first
    if (this.mockProviders.has(type)) {
      return this.mockProviders.get(type)!;
    }

    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`UNSUPPORTED_AI_PROVIDER: Provider '${type}' is not recognized`);
    }

    return provider;
  }

  /**
   * Lists all available providers and their configuration status (safe, no secrets).
   */
  static listProviders(): ProviderStatusInfo[] {
    const currentConfig = AIProviderConfigService.getRuntimeConfig();
    const result: ProviderStatusInfo[] = [];

    for (const [type, provider] of this.providers.entries()) {
      result.push({
        provider: type,
        isConfigured: provider.isAvailable(),
        defaultModel: provider.defaultModel,
        activeModel: AIProviderConfigService.getEffectiveModel(type),
        isDefault: type === currentConfig.defaultProvider
      });
    }

    return result;
  }
}

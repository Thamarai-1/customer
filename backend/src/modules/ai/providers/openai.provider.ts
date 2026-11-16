import OpenAI from 'openai';
import { IAIProvider } from '../ai-provider.interface.js';
import { AIProviderType, AIRequest, AIResponse } from '../ai-provider.types.js';
import { AIProviderConfigService } from '../ai-provider.config.js';
import { env } from '../../../config/env.js';

export class OpenAIProvider implements IAIProvider {
  readonly providerName = AIProviderType.OPENAI;
  readonly defaultModel = 'gpt-4o-mini';

  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY_NOT_CONFIGURED');
    }
    if (!this.client) {
      this.client = new OpenAI({ apiKey });
    }
    return this.client;
  }

  isAvailable(): boolean {
    const key = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    return Boolean(key && key.trim().length > 5);
  }

  async generateStructuredOutput<T>(
    request: AIRequest<T>,
    modelOverride?: string
  ): Promise<AIResponse<T>> {
    const client = this.getClient();
    const model = modelOverride || AIProviderConfigService.getEffectiveModel(AIProviderType.OPENAI) || this.defaultModel;
    const timeoutMs = request.timeoutMs ?? 30000;

    const startTime = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await client.chat.completions.create(
        {
          model,
          temperature: request.temperature ?? 0.3,
          max_tokens: request.maxTokens ?? 1200,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt }
          ]
        },
        { signal: controller.signal }
      );

      clearTimeout(timer);
      const latencyMs = Date.now() - startTime;
      const rawContent = response.choices[0]?.message?.content || '{}';

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawContent);
      } catch {
        throw new Error(`AI_PROVIDER_INVALID_JSON: ${rawContent.slice(0, 100)}`);
      }

      let validatedData: T;
      if (request.schema) {
        const parseResult = request.schema.safeParse(parsedJson);
        if (!parseResult.success) {
          throw new Error(
            `AI_PROVIDER_SCHEMA_VALIDATION_FAILED: ${parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
          );
        }
        validatedData = parseResult.data;
      } else {
        validatedData = parsedJson as T;
      }

      return {
        data: validatedData,
        rawContent,
        provider: AIProviderType.OPENAI,
        model,
        tokenUsage: {
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
          totalTokens: response.usage?.total_tokens
        },
        latencyMs,
        finishReason: response.choices[0]?.finish_reason || 'stop'
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof Error && (err.name === 'AbortError' || err.message.includes('abort'))) {
        throw new Error(`AI_PROVIDER_TIMEOUT: OpenAI request exceeded ${timeoutMs}ms limit`);
      }
      throw err instanceof Error ? err : new Error(String(err));
    }
  }
}

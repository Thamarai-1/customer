import Anthropic from '@anthropic-ai/sdk';
import { IAIProvider } from '../ai-provider.interface.js';
import { AIProviderType, AIRequest, AIResponse } from '../ai-provider.types.js';
import { AIProviderConfigService } from '../ai-provider.config.js';
import { env } from '../../../config/env.js';

export class AnthropicProvider implements IAIProvider {
  readonly providerName = AIProviderType.ANTHROPIC;
  readonly defaultModel = 'claude-3-5-haiku-20241022';

  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    const apiKey = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY_NOT_CONFIGURED');
    }
    if (!this.client) {
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  isAvailable(): boolean {
    const key = env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
    return Boolean(key && key.trim().length > 5);
  }

  async generateStructuredOutput<T>(
    request: AIRequest<T>,
    modelOverride?: string
  ): Promise<AIResponse<T>> {
    const client = this.getClient();
    const model = modelOverride || AIProviderConfigService.getEffectiveModel(AIProviderType.ANTHROPIC) || this.defaultModel;
    const timeoutMs = request.timeoutMs ?? 30000;

    const startTime = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const createParams: any = {
        model,
        max_tokens: request.maxTokens ?? 1200,
        system: `${request.systemPrompt}\n\nOutput instructions: You MUST respond ONLY with a raw, valid JSON object matching the requested schema. Do not write any explanatory text before or after the JSON.`,
        messages: [{ role: 'user', content: request.userPrompt }]
      };
      if (request.temperature !== undefined) {
        createParams.temperature = request.temperature;
      }

      const response = await client.messages.create(
        createParams,
        { signal: controller.signal }
      );

      clearTimeout(timer);
      const latencyMs = Date.now() - startTime;

      let rawContent = '';
      for (const block of response.content) {
        if (block.type === 'text') {
          rawContent += block.text;
        }
      }

      // Strip markdown code fences if present
      rawContent = rawContent.trim();
      if (rawContent.startsWith('```json')) {
        rawContent = rawContent.slice(7, rawContent.lastIndexOf('```')).trim();
      } else if (rawContent.startsWith('```')) {
        rawContent = rawContent.slice(3, rawContent.lastIndexOf('```')).trim();
      }

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
        provider: AIProviderType.ANTHROPIC,
        model,
        tokenUsage: {
          promptTokens: response.usage?.input_tokens,
          completionTokens: response.usage?.output_tokens,
          totalTokens: (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)
        },
        latencyMs,
        finishReason: response.stop_reason || 'stop'
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof Error && (err.name === 'AbortError' || err.message.includes('abort'))) {
        throw new Error(`AI_PROVIDER_TIMEOUT: Anthropic request exceeded ${timeoutMs}ms limit`);
      }
      throw err instanceof Error ? err : new Error(String(err));
    }
  }
}

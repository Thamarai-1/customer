import { GoogleGenAI } from '@google/genai';
import { IAIProvider } from '../ai-provider.interface.js';
import { AIProviderType, AIRequest, AIResponse } from '../ai-provider.types.js';
import { AIProviderConfigService } from '../ai-provider.config.js';
import { env } from '../../../config/env.js';

export class GeminiProvider implements IAIProvider {
  readonly providerName = AIProviderType.GEMINI;
  readonly defaultModel = 'gemini-2.5-flash';

  private ai: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
    }
    if (!this.ai) {
      this.ai = new GoogleGenAI({ apiKey });
    }
    return this.ai;
  }

  isAvailable(): boolean {
    const key = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    return Boolean(key && key.trim().length > 5);
  }

  async generateStructuredOutput<T>(
    request: AIRequest<T>,
    modelOverride?: string
  ): Promise<AIResponse<T>> {
    const ai = this.getClient();
    const model = modelOverride || AIProviderConfigService.getEffectiveModel(AIProviderType.GEMINI) || this.defaultModel;
    const timeoutMs = request.timeoutMs ?? 30000;

    const startTime = Date.now();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`AI_PROVIDER_TIMEOUT: Gemini request exceeded ${timeoutMs}ms limit`)), timeoutMs);
    });

    try {
      const combinedPrompt = `${request.systemPrompt}\n\nIMPORTANT: Respond strictly with valid JSON conforming to the requested schema. Do not include markdown code block syntax if possible.\n\nUser Request:\n${request.userPrompt}`;

      const generatePromise = ai.models.generateContent({
        model,
        contents: combinedPrompt,
        config: {
          responseMimeType: 'application/json',
          temperature: request.temperature ?? 0.3,
          maxOutputTokens: request.maxTokens ?? 1200
        }
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const latencyMs = Date.now() - startTime;

      let rawContent = response.text || '{}';
      // Strip markdown code fences if model returned ```json ... ```
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

      const usage = response.usageMetadata;

      return {
        data: validatedData,
        rawContent,
        provider: AIProviderType.GEMINI,
        model,
        tokenUsage: {
          promptTokens: usage?.promptTokenCount,
          completionTokens: usage?.candidatesTokenCount,
          totalTokens: usage?.totalTokenCount
        },
        latencyMs,
        finishReason: 'stop'
      };
    } catch (err: unknown) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  }
}

import { z } from 'zod';

export enum AIProviderType {
  OPENAI = 'OPENAI',
  GEMINI = 'GEMINI',
  ANTHROPIC = 'ANTHROPIC'
}

export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface AIRequest<T> {
  systemPrompt: string;
  userPrompt: string;
  schema?: z.ZodType<T>;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  jsonMode?: boolean;
}

export interface AIResponse<T> {
  data: T;
  rawContent: string;
  provider: AIProviderType;
  model: string;
  tokenUsage?: TokenUsage;
  latencyMs: number;
  finishReason?: string;
}

export interface ProviderStatusInfo {
  provider: AIProviderType;
  isConfigured: boolean;
  defaultModel: string;
  activeModel: string;
  isDefault: boolean;
}

export interface IMessageGenerationRuntimeConfig {
  defaultProvider: AIProviderType;
  openaiModel: string;
  geminiModel: string;
  anthropicModel: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  retryLimit: number;
  updatedAt?: Date;
  updatedBy?: string;
}

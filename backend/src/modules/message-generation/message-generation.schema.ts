import { z } from 'zod';
import { AIProviderType } from '../ai/ai-provider.types.js';

export const generatedEmailZodSchema = z.object({
  subject: z
    .string()
    .min(3, 'Subject must be at least 3 characters')
    .max(200, 'Subject exceeds 200 characters')
    .trim(),
  body: z
    .string()
    .min(10, 'Body must be at least 10 characters')
    .trim(),
  objective: z.string().trim(),
  tone: z.array(z.string()).or(z.string()),
  referencedOffers: z.array(z.string()).default([]),
  referencedBillingFacts: z.array(z.string()).default([]),
  generationNotes: z
    .object({
      usedCustomerName: z.boolean().optional(),
      usedApprovedOffer: z.boolean().optional(),
      usedBillingInformation: z.boolean().optional()
    })
    .optional()
});

export const generateMessageRequestSchema = z.object({
  params: z.object({
    customerId: z.string().min(1, 'Customer ID is required')
  }),
  body: z.object({
    channel: z.string().optional().default('EMAIL'),
    provider: z.nativeEnum(AIProviderType).optional(),
    model: z.string().optional()
  })
});

export const regenerateMessageRequestSchema = z.object({
  params: z.object({
    messageId: z.string().min(1, 'Message ID is required')
  }),
  body: z.object({
    reason: z.string().optional(),
    provider: z.nativeEnum(AIProviderType).optional(),
    model: z.string().optional()
  })
});

export const customerMessageParamSchema = z.object({
  params: z.object({
    customerId: z.string().min(1, 'Customer ID is required')
  })
});

export const messageIdParamSchema = z.object({
  params: z.object({
    messageId: z.string().min(1, 'Message ID is required')
  })
});

export const updateMessageGenerationConfigSchema = z.object({
  body: z.object({
    defaultProvider: z.nativeEnum(AIProviderType).optional(),
    openaiModel: z.string().min(2).optional(),
    geminiModel: z.string().min(2).optional(),
    anthropicModel: z.string().min(2).optional(),
    temperature: z.number().min(0).max(1).optional(),
    maxTokens: z.number().int().min(100).max(4000).optional(),
    timeoutMs: z.number().int().min(1000).max(120000).optional(),
    retryLimit: z.number().int().min(0).max(5).optional()
  })
});

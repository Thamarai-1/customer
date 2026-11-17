import { z } from 'zod';
import { DeliveryMode, DeliveryStatus } from './delivery.constants.js';

export const CreateDeliverySchema = z.object({
  generatedMessageId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid generatedMessageId format'),
  messageVersion: z.number().int().min(1, 'Message version must be at least 1'),
  deliveryMode: z.nativeEnum(DeliveryMode),
  idempotencyKey: z.string().trim().min(3).max(120).optional(),
  channel: z.string().trim().optional()
});

export const DeliveryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  customerId: z.string().trim().optional(),
  campaignId: z.string().trim().optional(),
  status: z.nativeEnum(DeliveryStatus).optional(),
  channel: z.string().trim().optional(),
  deliveryMode: z.nativeEnum(DeliveryMode).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

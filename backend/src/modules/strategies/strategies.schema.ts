import { z } from 'zod';
import { CustomerSegmentType } from '../segmentation/segmentation.constants.js';
import { StrategyObjective, CommunicationTone } from './strategies.types.js';

export const segmentParamSchema = z.object({
  params: z.object({
    segmentName: z.nativeEnum(CustomerSegmentType)
  })
});

export const customerStrategyParamSchema = z.object({
  params: z.object({
    customerId: z.string().min(1, 'Customer ID is required')
  })
});

export const updateStrategyConfigSchema = z.object({
  params: z.object({
    segmentName: z.nativeEnum(CustomerSegmentType)
  }),
  body: z.object({
    objective: z.nativeEnum(StrategyObjective).optional(),
    primaryTone: z.nativeEnum(CommunicationTone).optional(),
    alternativeTones: z.array(z.nativeEnum(CommunicationTone)).optional(),
    recommendedActions: z.array(z.string()).optional(),
    priority: z.number().int().min(1).optional(),
    description: z.string().min(5).optional(),
    allowPromotionsWithOverdue: z.boolean().optional(),
    isActive: z.boolean().optional()
  })
});

import { z } from 'zod';
import { ActivityType } from './activity.model.js';

export const createActivitySchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Customer ID parameter is required')
  }),
  body: z.object({
    activityType: z.nativeEnum(ActivityType, {
      errorMap: () => ({
        message:
          'Activity type must be LOGIN, PURCHASE, PLAN_RENEWAL, SERVICE_USAGE, SUPPORT_INTERACTION, or APP_INTERACTION'
      })
    }),
    activityDate: z.string().datetime().or(z.date()).optional(),
    source: z.string().optional().default('WEB'),
    metadata: z.record(z.unknown()).optional()
  })
});

export const queryActivitySchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Customer ID parameter is required')
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    activityType: z.nativeEnum(ActivityType).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional()
  }).optional()
});

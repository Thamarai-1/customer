import { z } from 'zod';
import { CustomerSegmentType, ClassificationStatus } from './segmentation.constants.js';

export const classifyCustomerSchema = z.object({
  params: z.object({
    customerId: z.string().min(1, 'Customer identifier is required')
  })
});

export const getSegmentCustomersSchema = z.object({
  params: z.object({
    segmentName: z.string().min(1, 'Segment name parameter is required')
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    primarySegment: z.nativeEnum(CustomerSegmentType).optional(),
    status: z.nativeEnum(ClassificationStatus).optional(),
    minConfidence: z.coerce.number().min(0).max(1).optional(),
    sortBy: z.string().default('classifiedAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
});

export const updateSegmentationConfigSchema = z.object({
  body: z.object({
    ruleVersion: z
      .string()
      .min(1, 'Rule version string is required')
      .regex(/^\d+\.\d+\.\d+$/, 'Rule version must be semantic versioning (e.g. 1.1.0)'),
    activityObservationDays: z.number().int().min(7).max(365).optional(),
    previousActivityComparisonDays: z.number().int().min(7).max(365).optional(),
    activityReductionThresholdPercent: z.number().min(10).max(95).optional(),
    minBaselineActivityCount: z.number().int().min(1).max(100).optional(),
    inactivityThresholdDays: z.number().int().min(14).max(730).optional(),
    minTotalActivitiesForHistory: z.number().int().min(1).max(20).optional(),
    loyaltyPointsThreshold: z.number().min(0).max(100000).optional(),
    membershipDurationDaysThreshold: z.number().int().min(0).max(3650).optional(),
    consistentMinMonthlyActivities: z.number().int().min(1).max(100).optional(),
    segmentPriority: z.array(z.nativeEnum(CustomerSegmentType)).min(1).max(5).optional(),
    notes: z.string().max(500).optional()
  })
});

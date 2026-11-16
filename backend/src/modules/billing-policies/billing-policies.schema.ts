import { z } from 'zod';

export const customerBillingParamSchema = z.object({
  params: z.object({
    customerId: z.string().min(1, 'Customer ID is required')
  })
});

export const updateBillingPolicySchema = z.object({
  body: z.object({
    upcomingDaysThreshold: z.number().int().min(1).max(30).optional(),
    reminder1DaysThreshold: z.number().int().min(1).max(30).optional(),
    reminder2DaysThreshold: z.number().int().min(2).max(60).optional(),
    reminder3DaysThreshold: z.number().int().min(5).max(90).optional(),
    escalationDaysThreshold: z.number().int().min(10).max(180).optional(),
    requireHumanReviewForEscalation: z.boolean().optional(),
    excludeDisputedInvoices: z.boolean().optional(),
    minOutstandingAmountToRemind: z.number().min(0).optional()
  })
});

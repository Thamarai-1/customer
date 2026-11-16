import { z } from 'zod';

export const messageIdParamSchema = z.object({
  params: z.object({
    messageId: z.string().min(1, 'Message ID is required')
  })
});

export const reportIdParamSchema = z.object({
  params: z.object({
    reportId: z.string().min(1, 'Report ID is required')
  })
});

export const customerIdParamSchema = z.object({
  params: z.object({
    customerId: z.string().min(1, 'Customer ID is required')
  })
});

export const updateCompliancePolicyConfigSchema = z.object({
  body: z.object({
    version: z.string().optional(),
    frequencyLimits: z
      .object({
        maxDailyMarketingEmails: z.number().min(1).max(20).optional(),
        maxWeeklyMarketingEmails: z.number().min(1).max(50).optional(),
        minIntervalHoursMarketing: z.number().min(0).max(168).optional(),
        maxBillingRemindersPerMonth: z.number().min(1).max(30).optional()
      })
      .optional(),
    blockedPhrases: z.array(z.string().min(1)).optional(),
    requiredDisclaimers: z
      .object({
        offerTermsText: z.string().optional(),
        billingDisputeText: z.string().optional(),
        supportContactText: z.string().optional()
      })
      .optional(),
    duplicateWindowHours: z.number().min(1).max(720).optional()
  })
});

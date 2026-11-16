import { z } from 'zod';
import { CampaignStatus, CampaignObjective } from './campaigns.types.js';
import { CustomerSegmentType } from '../segmentation/segmentation.constants.js';

export const createCampaignSchema = z.object({
  body: z
    .object({
      campaignCode: z
        .string()
        .min(3, 'Campaign code must be at least 3 characters')
        .max(50)
        .trim()
        .toUpperCase(),
      name: z.string().min(2, 'Name is required').trim(),
      description: z.string().min(5, 'Description is required').trim(),
      objective: z.nativeEnum(CampaignObjective),
      targetSegments: z.array(z.nativeEnum(CustomerSegmentType)).min(1, 'At least one target segment is required'),
      status: z.nativeEnum(CampaignStatus).optional().default(CampaignStatus.DRAFT),
      startDate: z.string().datetime().or(z.date()),
      endDate: z.string().datetime().or(z.date()),
      allowedChannels: z.array(z.string()).optional().default(['EMAIL']),
      offerIds: z.array(z.string()).optional().default([]),
      priority: z.number().int().min(1).max(100).optional().default(1),
      toneGuideline: z.string().optional().default('Warm, professional and appreciative'),
      mandatoryDisclaimers: z.array(z.string()).optional().default([]),
      blockedKeywords: z.array(z.string()).optional().default([]),
      budgetTotal: z.number().positive().optional()
    })
    .refine((data) => new Date(data.startDate).getTime() < new Date(data.endDate).getTime(), {
      message: 'End date must be strictly after start date',
      path: ['endDate']
    })
});

export const updateCampaignSchema = z.object({
  params: z.object({
    campaignId: z.string().min(1, 'Campaign ID parameter is required')
  }),
  body: z
    .object({
      name: z.string().min(2).trim().optional(),
      description: z.string().min(5).trim().optional(),
      objective: z.nativeEnum(CampaignObjective).optional(),
      targetSegments: z.array(z.nativeEnum(CustomerSegmentType)).optional(),
      status: z.nativeEnum(CampaignStatus).optional(),
      startDate: z.string().datetime().or(z.date()).optional(),
      endDate: z.string().datetime().or(z.date()).optional(),
      allowedChannels: z.array(z.string()).optional(),
      priority: z.number().int().min(1).max(100).optional(),
      toneGuideline: z.string().optional(),
      mandatoryDisclaimers: z.array(z.string()).optional(),
      blockedKeywords: z.array(z.string()).optional(),
      budgetTotal: z.number().positive().optional()
    })
    .refine(
      (data) => {
        if (data.startDate && data.endDate) {
          return new Date(data.startDate).getTime() < new Date(data.endDate).getTime();
        }
        return true;
      },
      {
        message: 'End date must be strictly after start date',
        path: ['endDate']
      }
    )
});

export const updateCampaignStatusSchema = z.object({
  params: z.object({
    campaignId: z.string().min(1, 'Campaign ID is required')
  }),
  body: z.object({
    status: z.nativeEnum(CampaignStatus)
  })
});

export const campaignIdParamSchema = z.object({
  params: z.object({
    campaignId: z.string().min(1, 'Campaign ID is required')
  })
});

export const attachOfferSchema = z.object({
  params: z.object({
    campaignId: z.string().min(1, 'Campaign ID is required')
  }),
  body: z.object({
    offerId: z.string().min(1, 'Offer ID is required')
  })
});

export const detachOfferSchema = z.object({
  params: z.object({
    campaignId: z.string().min(1, 'Campaign ID is required'),
    offerId: z.string().min(1, 'Offer ID is required')
  })
});

export const queryCampaignsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.nativeEnum(CampaignStatus).optional(),
    objective: z.nativeEnum(CampaignObjective).optional(),
    targetSegment: z.nativeEnum(CustomerSegmentType).optional(),
    search: z.string().optional(),
    sortBy: z.string().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
});

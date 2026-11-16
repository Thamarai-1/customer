import { z } from 'zod';
import { OfferType, OfferStatus, OfferValueType } from './offers.types.js';
import { CustomerSegmentType } from '../segmentation/segmentation.constants.js';

export const createOfferSchema = z.object({
  body: z
    .object({
      offerCode: z
        .string()
        .min(3, 'Offer code must be at least 3 characters')
        .max(50)
        .trim()
        .toUpperCase(),
      name: z.string().min(2, 'Name is required').trim(),
      description: z.string().min(5, 'Description is required').trim(),
      offerType: z.nativeEnum(OfferType),
      value: z.number().min(0, 'Value must be non-negative'),
      valueType: z.nativeEnum(OfferValueType).optional().default(OfferValueType.FIXED_AMOUNT),
      currency: z.string().nullable().optional().default('USD'),
      targetSegments: z.array(z.nativeEnum(CustomerSegmentType)).default([]),
      eligibilityRules: z
        .object({
          minimumLoyaltyPoints: z.number().min(0).optional(),
          minimumMembershipDays: z.number().min(0).optional(),
          requiredLoyaltyTiers: z.array(z.string()).optional(),
          requiredAccountStatus: z.string().optional(),
          requiredPlanStatus: z.string().optional(),
          requiredPlanType: z.string().optional(),
          maxOverdueBalance: z.number().min(0).optional(),
          maxDaysOverdue: z.number().min(0).optional()
        })
        .optional()
        .default({}),
      validFrom: z.string().datetime().or(z.date()),
      validUntil: z.string().datetime().or(z.date()),
      allowedChannels: z.array(z.string()).optional().default(['EMAIL']),
      termsAndConditions: z.array(z.string()).optional().default([]),
      status: z.nativeEnum(OfferStatus).optional().default(OfferStatus.DRAFT),
      maxRedemptions: z.number().int().min(1).optional().default(1000)
    })
    .refine((data) => new Date(data.validFrom).getTime() < new Date(data.validUntil).getTime(), {
      message: 'validUntil must be strictly after validFrom',
      path: ['validUntil']
    })
});

export const updateOfferSchema = z.object({
  params: z.object({
    offerId: z.string().min(1, 'Offer ID is required')
  }),
  body: z
    .object({
      name: z.string().min(2).trim().optional(),
      description: z.string().min(5).trim().optional(),
      offerType: z.nativeEnum(OfferType).optional(),
      value: z.number().min(0).optional(),
      valueType: z.nativeEnum(OfferValueType).optional(),
      currency: z.string().nullable().optional(),
      targetSegments: z.array(z.nativeEnum(CustomerSegmentType)).optional(),
      eligibilityRules: z
        .object({
          minimumLoyaltyPoints: z.number().min(0).optional(),
          minimumMembershipDays: z.number().min(0).optional(),
          requiredLoyaltyTiers: z.array(z.string()).optional(),
          requiredAccountStatus: z.string().optional(),
          requiredPlanStatus: z.string().optional(),
          requiredPlanType: z.string().optional(),
          maxOverdueBalance: z.number().min(0).optional(),
          maxDaysOverdue: z.number().min(0).optional()
        })
        .optional(),
      validFrom: z.string().datetime().or(z.date()).optional(),
      validUntil: z.string().datetime().or(z.date()).optional(),
      allowedChannels: z.array(z.string()).optional(),
      termsAndConditions: z.array(z.string()).optional(),
      status: z.nativeEnum(OfferStatus).optional(),
      maxRedemptions: z.number().int().min(1).optional()
    })
    .refine(
      (data) => {
        if (data.validFrom && data.validUntil) {
          return new Date(data.validFrom).getTime() < new Date(data.validUntil).getTime();
        }
        return true;
      },
      {
        message: 'validUntil must be strictly after validFrom',
        path: ['validUntil']
      }
    )
});

export const updateOfferStatusSchema = z.object({
  params: z.object({
    offerId: z.string().min(1, 'Offer ID is required')
  }),
  body: z.object({
    status: z.nativeEnum(OfferStatus)
  })
});

export const offerIdParamSchema = z.object({
  params: z.object({
    offerId: z.string().min(1, 'Offer ID is required')
  })
});

export const evaluateOfferParamSchema = z.object({
  params: z.object({
    offerId: z.string().min(1, 'Offer ID is required'),
    customerId: z.string().min(1, 'Customer ID is required')
  }),
  query: z.object({
    channel: z.string().optional().default('EMAIL')
  })
});

export const queryOffersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.nativeEnum(OfferStatus).optional(),
    offerType: z.nativeEnum(OfferType).optional(),
    targetSegment: z.nativeEnum(CustomerSegmentType).optional(),
    search: z.string().optional(),
    sortBy: z.string().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
});

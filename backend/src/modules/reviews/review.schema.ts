import { z } from 'zod';
import { RejectionReasonCode } from './review.constants.js';
import { AIProviderType } from '../ai/ai-provider.types.js';

export const reviewIdParamSchema = z.object({
  params: z.object({
    reviewId: z.string().min(1, 'Review ID is required')
  })
});

export const editMessageSchema = z.object({
  params: z.object({
    reviewId: z.string().min(1, 'Review ID is required')
  }),
  body: z.object({
    subject: z.string().min(1, 'Subject cannot be empty').max(200, 'Subject is too long'),
    body: z.string().min(1, 'Body cannot be empty'),
    editReason: z.string().max(500, 'Edit reason is too long').optional()
  })
});

export const regenerateReviewSchema = z.object({
  params: z.object({
    reviewId: z.string().min(1, 'Review ID is required')
  }),
  body: z.object({
    reason: z.string().max(500).optional(),
    provider: z.nativeEnum(AIProviderType).optional(),
    modelOverride: z.string().optional()
  })
});

export const approveReviewSchema = z.object({
  params: z.object({
    reviewId: z.string().min(1, 'Review ID is required')
  }),
  body: z.object({
    messageVersion: z.number().int().positive('Valid message version is required'),
    complianceValidationId: z.string().min(1, 'Compliance validation ID is required'),
    warningAcknowledgements: z.array(z.string()).optional().default([]),
    comments: z.string().max(500).optional()
  })
});

export const rejectReviewSchema = z.object({
  params: z.object({
    reviewId: z.string().min(1, 'Review ID is required')
  }),
  body: z.object({
    rejectionReasonCode: z.nativeEnum(RejectionReasonCode),
    rejectionReason: z.string().min(3, 'Rejection reason must be at least 3 characters'),
    comments: z.string().max(500).optional()
  })
});

export const requestRevisionSchema = z.object({
  params: z.object({
    reviewId: z.string().min(1, 'Review ID is required')
  }),
  body: z.object({
    comments: z.string().min(3, 'Revision comments must provide actionable instructions')
  })
});

export const assignReviewerSchema = z.object({
  params: z.object({
    reviewId: z.string().min(1, 'Review ID is required')
  }),
  body: z.object({
    reviewerId: z.string().min(1, 'Reviewer ID is required')
  })
});

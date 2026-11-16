import { z } from 'zod';
import { CustomerType, AccountStatus, LoyaltyTier, PlanStatus } from './customer.model.js';

export const createCustomerSchema = z.object({
  body: z.object({
    customerId: z
      .string()
      .min(3, 'Customer ID must be at least 3 characters')
      .max(50)
      .trim()
      .toUpperCase(),
    firstName: z.string().min(1, 'First name is required').trim(),
    lastName: z.string().min(1, 'Last name is required').trim(),
    email: z.string().email('Invalid email address format').toLowerCase().trim(),
    phone: z.string().optional(),
    customerType: z.nativeEnum(CustomerType).optional().default(CustomerType.RETAIL),
    accountStatus: z.nativeEnum(AccountStatus).optional().default(AccountStatus.ACTIVE),
    loyaltyInfo: z
      .object({
        loyaltyTier: z.nativeEnum(LoyaltyTier).optional().default(LoyaltyTier.BRONZE),
        loyaltyPoints: z.number().nonnegative().optional().default(0),
        membershipStartDate: z.string().datetime().or(z.date()).optional()
      })
      .optional(),
    subscription: z
      .object({
        activePlan: z.string().min(1, 'Active plan is required'),
        planType: z.string().optional().default('Postpaid'),
        planStatus: z.nativeEnum(PlanStatus).optional().default(PlanStatus.ACTIVE),
        planStartDate: z.string().datetime().or(z.date()).optional(),
        planEndDate: z.string().datetime().or(z.date()).optional()
      })
      .optional(),
    source: z.string().optional().default('MANUAL')
  })
});

export const updateCustomerSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Customer ID parameter is required')
  }),
  body: z.object({
    firstName: z.string().min(1).trim().optional(),
    lastName: z.string().min(1).trim().optional(),
    email: z.string().email().toLowerCase().trim().optional(),
    phone: z.string().optional(),
    customerType: z.nativeEnum(CustomerType).optional(),
    loyaltyInfo: z
      .object({
        loyaltyTier: z.nativeEnum(LoyaltyTier).optional(),
        loyaltyPoints: z.number().nonnegative().optional(),
        membershipStartDate: z.string().datetime().or(z.date()).optional()
      })
      .optional(),
    subscription: z
      .object({
        activePlan: z.string().optional(),
        planType: z.string().optional(),
        planStatus: z.nativeEnum(PlanStatus).optional(),
        planStartDate: z.string().datetime().or(z.date()).optional(),
        planEndDate: z.string().datetime().or(z.date()).optional()
      })
      .optional()
  })
});

export const updateStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Customer ID parameter is required')
  }),
  body: z.object({
    status: z.nativeEnum(AccountStatus, {
      errorMap: () => ({ message: 'Status must be ACTIVE, INACTIVE, SUSPENDED, or ARCHIVED' })
    })
  })
});

export const queryCustomerSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    loyaltyTier: z.nativeEnum(LoyaltyTier).optional(),
    accountStatus: z.nativeEnum(AccountStatus).optional(),
    activePlan: z.string().optional(),
    planStatus: z.nativeEnum(PlanStatus).optional(),
    customerType: z.nativeEnum(CustomerType).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc', '1', '-1']).optional()
  }).optional()
});

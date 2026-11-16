import { z } from 'zod';
import { CustomerType, AccountStatus, LoyaltyTier, PlanStatus } from '../customers/customer.model.js';

export const importCustomerRecordSchema = z.object({
  customerId: z.string().min(2, 'Customer ID must be at least 2 characters').trim(),
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  phone: z.string().optional(),
  customerType: z
    .string()
    .optional()
    .transform((val) => (val ? val.toUpperCase() : 'RETAIL'))
    .pipe(z.nativeEnum(CustomerType).catch(CustomerType.RETAIL)),
  accountStatus: z
    .string()
    .optional()
    .transform((val) => (val ? val.toUpperCase() : 'ACTIVE'))
    .pipe(z.nativeEnum(AccountStatus).catch(AccountStatus.ACTIVE)),
  loyaltyTier: z
    .string()
    .optional()
    .transform((val) => (val ? val.toUpperCase() : 'BRONZE'))
    .pipe(z.nativeEnum(LoyaltyTier).catch(LoyaltyTier.BRONZE)),
  loyaltyPoints: z
    .string()
    .or(z.number())
    .optional()
    .transform((val) => (val !== undefined ? Math.max(0, parseInt(String(val), 10) || 0) : 0)),
  activePlan: z.string().optional().default('Standard'),
  planType: z.string().optional().default('Postpaid'),
  planStatus: z
    .string()
    .optional()
    .transform((val) => (val ? val.toUpperCase() : 'ACTIVE'))
    .pipe(z.nativeEnum(PlanStatus).catch(PlanStatus.ACTIVE))
});

export type ValidatedImportRecord = z.infer<typeof importCustomerRecordSchema>;

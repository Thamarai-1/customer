import { z } from 'zod';

export const customerPolicyParamSchema = z.object({
  params: z.object({
    customerId: z.string().min(1, 'Customer ID is required')
  }),
  query: z.object({
    channel: z.string().optional()
  })
});

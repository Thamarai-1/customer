import { z } from 'zod';
import { PaymentStatus, InvoiceStatus } from './billing-record.model.js';

export const createBillingSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Customer ID parameter is required')
  }),
  body: z.object({
    invoiceId: z
      .string()
      .min(3, 'Invoice ID must be at least 3 characters')
      .trim()
      .toUpperCase(),
    invoiceAmount: z.number().positive('Invoice amount must be positive'),
    outstandingAmount: z.number().nonnegative('Outstanding amount cannot be negative'),
    currency: z.string().length(3, 'Currency must be 3-letter code (e.g. USD)').toUpperCase().default('USD'),
    invoiceDate: z.string().datetime().or(z.date()).optional(),
    dueDate: z.string().datetime().or(z.date()),
    paymentDate: z.string().datetime().or(z.date()).optional(),
    paymentStatus: z.nativeEnum(PaymentStatus).optional().default(PaymentStatus.PENDING),
    invoiceStatus: z.nativeEnum(InvoiceStatus).optional().default(InvoiceStatus.ACTIVE),
    disputeStatus: z.string().optional().default('NONE'),
    notes: z.string().optional()
  })
});

export const queryBillingSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    invoiceStatus: z.nativeEnum(InvoiceStatus).optional(),
    customerId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional()
  }).optional()
});

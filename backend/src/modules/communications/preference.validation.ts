import { z } from 'zod';
import { PreferredChannel } from './preference.model.js';

export const updatePreferenceSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Customer ID parameter is required')
  }),
  body: z.object({
    emailConsent: z.boolean().optional(),
    smsConsent: z.boolean().optional(),
    whatsappConsent: z.boolean().optional(),
    preferredChannel: z.nativeEnum(PreferredChannel).optional(),
    optedOut: z.boolean().optional(),
    consentSource: z.string().optional(),
    notes: z.string().optional()
  })
});

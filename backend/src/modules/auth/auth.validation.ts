import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address format').toLowerCase().trim(),
    password: z.string().min(1, 'Password is required')
  })
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional()
  }).optional()
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long')
  })
});

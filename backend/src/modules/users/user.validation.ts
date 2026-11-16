import { z } from 'zod';
import { UserRole } from './user.model.js';

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters long').trim(),
    email: z.string().email('Invalid email address format').toLowerCase().trim(),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    role: z.nativeEnum(UserRole, {
      errorMap: () => ({ message: 'Role must be ADMIN, MARKETING_MANAGER, or COMPLIANCE_REVIEWER' })
    }),
    department: z.string().optional()
  })
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'User ID is required')
  }),
  body: z.object({
    name: z.string().min(2).trim().optional(),
    role: z.nativeEnum(UserRole).optional(),
    isActive: z.boolean().optional(),
    department: z.string().optional()
  })
});

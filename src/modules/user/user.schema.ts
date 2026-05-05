import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['BUYER', 'AGENT', 'ADMIN']),
});

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  role: z.enum(['BUYER', 'AGENT', 'ADMIN']).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

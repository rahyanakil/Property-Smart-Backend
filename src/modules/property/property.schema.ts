import { z } from 'zod';

export const createPropertySchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20),
  price: z.coerce.number().positive(),
  type: z.enum(['HOUSE', 'APARTMENT', 'CONDO', 'TOWNHOUSE', 'LAND', 'COMMERCIAL']).default('HOUSE'),
  status: z.enum(['AVAILABLE', 'PENDING', 'SOLD', 'RENTED', 'INACTIVE']).default('AVAILABLE'),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  zipCode: z.string().min(3),
  country: z.string().default('US'),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  bedrooms: z.coerce.number().int().min(0).default(0),
  bathrooms: z.coerce.number().min(0).default(0),
  area: z.coerce.number().positive(),
  // FormData sends repeated keys as array, single key as string — normalize both
  features: z.preprocess(
    (v) => (Array.isArray(v) ? v : v ? [v] : []),
    z.array(z.string())
  ).default([]),
  videoUrl: z.string().url().optional(),
  // FormData sends booleans as the string "true"/"false"
  isFeatured: z.preprocess((v) => v === 'true' || v === true, z.boolean()).default(false),
});

export const updatePropertySchema = createPropertySchema.partial();

export const propertyFilterSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(12),
  type: z.enum(['HOUSE', 'APARTMENT', 'CONDO', 'TOWNHOUSE', 'LAND', 'COMMERCIAL']).optional(),
  status: z.enum(['AVAILABLE', 'PENDING', 'SOLD', 'RENTED', 'INACTIVE']).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  minBedrooms: z.coerce.number().optional(),
  minBathrooms: z.coerce.number().optional(),
  minArea: z.coerce.number().optional(),
  maxArea: z.coerce.number().optional(),
  search: z.string().optional(),
  isFeatured: z.coerce.boolean().optional(),
  agentId: z.string().optional(),
  sortBy: z.enum(['price', 'createdAt', 'area', 'viewCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type PropertyFilterInput = z.infer<typeof propertyFilterSchema>;

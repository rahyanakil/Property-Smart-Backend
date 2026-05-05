import { z } from 'zod';

export const createBookingSchema = z.object({
  propertyId: z.string().cuid(),
  date: z.string().datetime(),
  timeSlot: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export const updateBookingSchema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED']),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

import { z } from 'zod';

export const createPaymentIntentSchema = z.object({
  propertyId: z.string().cuid(),
  amount: z.number().positive(),
  currency: z.string().default('usd'),
});

export const confirmPaymentSchema = z.object({
  paymentIntentId: z.string(),
  propertyId: z.string().cuid(),
});

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;

import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { initiatePayment, handleStripeWebhook, getBuyerPayments, getAllPayments, getPaymentStats } from './payment.service';

export const createPaymentIntentHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await initiatePayment(req.user!.userId, req.body);
  res.status(201).json(new ApiResponse(201, result, 'Payment intent created'));
});

export const stripeWebhookHandler = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  const result = await handleStripeWebhook(req.body as Buffer, signature);
  res.json(result);
});

export const myPaymentsHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '10' } = req.query as { page?: string; limit?: string };
  const result = await getBuyerPayments(req.user!.userId, parseInt(page), parseInt(limit));
  res.json(new ApiResponse(200, result, 'Payments fetched'));
});

export const adminPaymentsHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '10' } = req.query as { page?: string; limit?: string };
  const result = await getAllPayments(parseInt(page), parseInt(limit));
  res.json(new ApiResponse(200, result, 'All payments fetched'));
});

export const paymentStatsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await getPaymentStats();
  res.json(new ApiResponse(200, stats, 'Payment stats fetched'));
});

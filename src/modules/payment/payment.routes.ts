import { Router } from 'express';
import express from 'express';
import {
  createPaymentIntentHandler, stripeWebhookHandler,
  myPaymentsHandler, adminPaymentsHandler, paymentStatsHandler,
} from './payment.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createPaymentIntentSchema } from './payment.schema';

const router = Router();

// Stripe webhook (raw body)
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler);

// Authenticated
router.post('/intent', authenticate, authorize('BUYER'), validate(createPaymentIntentSchema), createPaymentIntentHandler);
router.get('/my', authenticate, myPaymentsHandler);

// Admin
router.get('/', authenticate, authorize('ADMIN'), adminPaymentsHandler);
router.get('/stats', authenticate, authorize('ADMIN'), paymentStatsHandler);

export default router;

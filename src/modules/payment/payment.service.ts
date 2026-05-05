import { prisma } from '../../lib/prisma';
import { stripe } from '../../lib/stripe';
import { ApiError } from '../../utils/ApiError';
import { CreatePaymentIntentInput } from './payment.schema';

export const initiatePayment = async (buyerId: string, data: CreatePaymentIntentInput) => {
  const property = await prisma.property.findUnique({ where: { id: data.propertyId } });
  if (!property) throw new ApiError(404, 'Property not found');

  const { createPaymentIntent } = await import('../../lib/stripe');
  const { clientSecret, paymentIntentId } = await createPaymentIntent(data.amount, data.currency, {
    buyerId,
    propertyId: data.propertyId,
    propertyTitle: property.title,
  });

  const payment = await prisma.payment.create({
    data: {
      buyerId,
      propertyId: data.propertyId,
      amount: data.amount,
      currency: data.currency,
      stripePaymentIntentId: paymentIntentId,
      stripeClientSecret: clientSecret,
    },
  });

  return { clientSecret, paymentId: payment.id, paymentIntentId };
};

export const handleStripeWebhook = async (payload: Buffer, signature: string) => {
  const { config } = await import('../../config');
  const event = stripe.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as { id: string; metadata: Record<string, string> };
    await prisma.payment.updateMany({
      where: { stripePaymentIntentId: pi.id },
      data: { status: 'SUCCEEDED' },
    });
    // Mark property as PENDING after payment
    if (pi.metadata?.propertyId) {
      await prisma.property.update({
        where: { id: pi.metadata.propertyId },
        data: { status: 'PENDING' },
      });
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as { id: string };
    await prisma.payment.updateMany({
      where: { stripePaymentIntentId: pi.id },
      data: { status: 'FAILED' },
    });
  }

  return { received: true };
};

export const getBuyerPayments = async (buyerId: string, page: number, limit: number) => {
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { buyerId },
      include: { property: { select: { id: true, title: true, images: true, address: true, city: true } } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.payment.count({ where: { buyerId } }),
  ]);
  return { payments, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getAllPayments = async (page: number, limit: number) => {
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      include: {
        buyer: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, title: true, images: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.payment.count(),
  ]);
  return { payments, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getPaymentStats = async () => {
  const [total, succeeded, pending, failed] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { status: 'SUCCEEDED' }, _sum: { amount: true }, _count: true }),
    prisma.payment.count({ where: { status: 'PENDING' } }),
    prisma.payment.count({ where: { status: 'FAILED' } }),
  ]);
  return {
    totalRevenue: total._sum.amount || 0,
    succeededRevenue: succeeded._sum.amount || 0,
    succeededCount: succeeded._count,
    pendingCount: pending,
    failedCount: failed,
  };
};

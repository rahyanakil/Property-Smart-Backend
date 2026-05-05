import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { CreateReviewInput } from './review.schema';

const reviewInclude = {
  user: { select: { id: true, name: true, avatar: true } },
  property: { select: { id: true, title: true } },
};

export const createReview = async (userId: string, propertyId: string, data: CreateReviewInput) => {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new ApiError(404, 'Property not found');

  return prisma.review.upsert({
    where: { propertyId_userId: { propertyId, userId } },
    create: { ...data, propertyId, userId },
    update: data,
    include: reviewInclude,
  });
};

export const getPropertyReviews = async (propertyId: string, page: number, limit: number) => {
  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { propertyId },
      include: reviewInclude,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.review.count({ where: { propertyId } }),
  ]);
  const avgRating = await prisma.review.aggregate({ where: { propertyId }, _avg: { rating: true } });
  return { reviews, total, page, limit, totalPages: Math.ceil(total / limit), avgRating: avgRating._avg.rating || 0 };
};

export const deleteReview = async (reviewId: string, userId: string, role: string) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new ApiError(404, 'Review not found');
  if (review.userId !== userId && role !== 'ADMIN') throw new ApiError(403, 'Not authorized');
  await prisma.review.delete({ where: { id: reviewId } });
};

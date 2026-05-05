import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { createReview, getPropertyReviews, deleteReview } from './review.service';

export const createReviewHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const review = await createReview(req.user!.userId, req.params.propertyId as string, req.body);
  res.status(201).json(new ApiResponse(201, review, 'Review submitted'));
});

export const getReviewsHandler = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '10' } = req.query as { page?: string; limit?: string };
  const result = await getPropertyReviews(req.params.propertyId as string, parseInt(page), parseInt(limit));
  res.json(new ApiResponse(200, result, 'Reviews fetched'));
});

export const deleteReviewHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  await deleteReview(req.params.id as string, req.user!.userId, req.user!.role);
  res.json(new ApiResponse(200, null, 'Review deleted'));
});

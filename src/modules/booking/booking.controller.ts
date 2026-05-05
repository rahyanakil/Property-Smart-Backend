import { Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { AuthRequest } from '../../middlewares/auth.middleware';
import {
  createBooking, getBuyerBookings, getAgentBookings,
  updateBookingStatus, getAllBookings,
} from './booking.service';
import { BookingStatus } from '@prisma/client';

export const createBookingHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const booking = await createBooking(req.user!.userId, req.body);
  res.status(201).json(new ApiResponse(201, booking, 'Booking created'));
});

export const getMyBookings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '10' } = req.query as { page?: string; limit?: string };
  const result = await getBuyerBookings(req.user!.userId, parseInt(page), parseInt(limit));
  res.json(new ApiResponse(200, result, 'Bookings fetched'));
});

export const getAgentBookingsHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '10' } = req.query as { page?: string; limit?: string };
  const result = await getAgentBookings(req.user!.userId, parseInt(page), parseInt(limit));
  res.json(new ApiResponse(200, result, 'Agent bookings fetched'));
});

export const updateBookingHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const booking = await updateBookingStatus(
    req.params.id as string, req.user!.userId, req.user!.role, req.body.status as BookingStatus
  );
  res.json(new ApiResponse(200, booking, 'Booking updated'));
});

export const adminBookingsHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '10' } = req.query as { page?: string; limit?: string };
  const result = await getAllBookings(parseInt(page), parseInt(limit));
  res.json(new ApiResponse(200, result, 'All bookings fetched'));
});

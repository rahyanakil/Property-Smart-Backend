import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { CreateBookingInput } from './booking.schema';
import { BookingStatus, Role } from '@prisma/client';

const bookingInclude = {
  property: {
    select: { id: true, title: true, address: true, city: true, images: true, price: true,
      agent: { select: { id: true, name: true, email: true, phone: true, avatar: true } }
    },
  },
  buyer: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
};

export const createBooking = async (buyerId: string, data: CreateBookingInput) => {
  const property = await prisma.property.findUnique({ where: { id: data.propertyId } });
  if (!property) throw new ApiError(404, 'Property not found');
  if (property.status !== 'AVAILABLE') throw new ApiError(400, 'Property is not available for booking');

  // Prevent duplicate booking on same slot
  const existing = await prisma.booking.findFirst({
    where: { propertyId: data.propertyId, date: new Date(data.date), timeSlot: data.timeSlot, status: { not: 'CANCELLED' } },
  });
  if (existing) throw new ApiError(409, 'This time slot is already booked');

  return prisma.booking.create({
    data: { ...data, date: new Date(data.date), buyerId },
    include: bookingInclude,
  });
};

export const getBuyerBookings = async (buyerId: string, page: number, limit: number) => {
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: { buyerId },
      include: bookingInclude,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.booking.count({ where: { buyerId } }),
  ]);
  return { bookings, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getAgentBookings = async (agentId: string, page: number, limit: number) => {
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: { property: { agentId } },
      include: bookingInclude,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { date: 'asc' },
    }),
    prisma.booking.count({ where: { property: { agentId } } }),
  ]);
  return { bookings, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const updateBookingStatus = async (
  bookingId: string, userId: string, role: string, status: BookingStatus
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { property: true },
  });
  if (!booking) throw new ApiError(404, 'Booking not found');

  const isAgent = booking.property.agentId === userId;
  const isBuyer = booking.buyerId === userId;
  const isAdmin = role === Role.ADMIN;

  if (!isAgent && !isBuyer && !isAdmin) throw new ApiError(403, 'Not authorized');
  if (status === 'CANCELLED' && !isBuyer && !isAdmin) throw new ApiError(403, 'Only buyer or admin can cancel');
  if ((status === 'CONFIRMED' || status === 'COMPLETED') && !isAgent && !isAdmin) throw new ApiError(403, 'Only agent can confirm/complete');

  return prisma.booking.update({ where: { id: bookingId }, data: { status }, include: bookingInclude });
};

export const getAllBookings = async (page: number, limit: number) => {
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      include: bookingInclude,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.booking.count(),
  ]);
  return { bookings, total, page, limit, totalPages: Math.ceil(total / limit) };
};

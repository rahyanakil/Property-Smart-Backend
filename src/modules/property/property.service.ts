import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { CreatePropertyInput, UpdatePropertyInput, PropertyFilterInput } from './property.schema';
import { PropertyType, PropertyStatus, Role } from '@prisma/client';

const propertyInclude = {
  agent: { select: { id: true, name: true, email: true, avatar: true, phone: true } },
  _count: { select: { bookings: true, favorites: true, reviews: true } },
};

const buildWhereClause = (filters: PropertyFilterInput) => ({
  ...(filters.type && { type: filters.type as PropertyType }),
  ...(filters.status ? { status: filters.status as PropertyStatus } : { status: 'AVAILABLE' as PropertyStatus }),
  ...(filters.city && { city: { contains: filters.city, mode: 'insensitive' as const } }),
  ...(filters.state && { state: { contains: filters.state, mode: 'insensitive' as const } }),
  ...(filters.agentId && { agentId: filters.agentId }),
  ...(filters.isFeatured !== undefined && { isFeatured: filters.isFeatured }),
  ...((filters.minPrice || filters.maxPrice) && {
    price: { ...(filters.minPrice && { gte: filters.minPrice }), ...(filters.maxPrice && { lte: filters.maxPrice }) },
  }),
  ...(filters.minBedrooms && { bedrooms: { gte: filters.minBedrooms } }),
  ...(filters.minBathrooms && { bathrooms: { gte: filters.minBathrooms } }),
  ...((filters.minArea || filters.maxArea) && {
    area: { ...(filters.minArea && { gte: filters.minArea }), ...(filters.maxArea && { lte: filters.maxArea }) },
  }),
  ...(filters.search && {
    OR: [
      { title: { contains: filters.search, mode: 'insensitive' as const } },
      { description: { contains: filters.search, mode: 'insensitive' as const } },
      { address: { contains: filters.search, mode: 'insensitive' as const } },
      { city: { contains: filters.search, mode: 'insensitive' as const } },
    ],
  }),
});

export const getProperties = async (filters: PropertyFilterInput) => {
  const where = buildWhereClause(filters);
  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: propertyInclude,
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      orderBy: { [filters.sortBy]: filters.sortOrder },
    }),
    prisma.property.count({ where }),
  ]);
  return { properties, total, page: filters.page, limit: filters.limit, totalPages: Math.ceil(total / filters.limit) };
};

export const getPropertyById = async (id: string, incrementView = false) => {
  if (incrementView) {
    await prisma.property.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
  }
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      ...propertyInclude,
      reviews: { include: { user: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!property) throw new ApiError(404, 'Property not found');
  return property;
};

export const createProperty = async (agentId: string, data: CreatePropertyInput, images: string[]) => {
  return prisma.property.create({
    data: { ...data, agentId, images },
    include: propertyInclude,
  });
};

export const updateProperty = async (
  id: string, userId: string, role: string, data: UpdatePropertyInput, newImages?: string[]
) => {
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) throw new ApiError(404, 'Property not found');
  if (role !== Role.ADMIN && property.agentId !== userId) throw new ApiError(403, 'Not authorized');

  return prisma.property.update({
    where: { id },
    data: { ...data, ...(newImages && { images: [...property.images, ...newImages] }) },
    include: propertyInclude,
  });
};

export const deleteProperty = async (id: string, userId: string, role: string) => {
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) throw new ApiError(404, 'Property not found');
  if (role !== Role.ADMIN && property.agentId !== userId) throw new ApiError(403, 'Not authorized');
  await prisma.property.delete({ where: { id } });
};

export const removePropertyImage = async (id: string, userId: string, role: string, imageUrl: string) => {
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) throw new ApiError(404, 'Property not found');
  if (role !== Role.ADMIN && property.agentId !== userId) throw new ApiError(403, 'Not authorized');

  const images = property.images.filter((img) => img !== imageUrl);
  return prisma.property.update({ where: { id }, data: { images }, include: propertyInclude });
};

export const getFeaturedProperties = async (limit = 6) => {
  return prisma.property.findMany({
    where: { isFeatured: true, status: 'AVAILABLE' },
    include: propertyInclude,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
};

export const getAgentProperties = async (agentId: string, page: number, limit: number) => {
  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where: { agentId },
      include: propertyInclude,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.property.count({ where: { agentId } }),
  ]);
  return { properties, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getPropertyStats = async () => {
  const [total, available, sold, byType] = await Promise.all([
    prisma.property.count(),
    prisma.property.count({ where: { status: 'AVAILABLE' } }),
    prisma.property.count({ where: { status: 'SOLD' } }),
    prisma.property.groupBy({ by: ['type'], _count: true }),
  ]);
  return { total, available, sold, byType };
};

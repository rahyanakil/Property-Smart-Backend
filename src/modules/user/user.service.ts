import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { UpdateProfileInput } from './user.schema';
import { Role } from '@prisma/client';

const userSelect = {
  id: true, name: true, email: true, role: true,
  avatar: true, phone: true, bio: true, isVerified: true,
  isActive: true, createdAt: true, updatedAt: true,
};

export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

export const updateProfile = async (userId: string, data: UpdateProfileInput) => {
  const user = await prisma.user.update({ where: { id: userId }, data, select: userSelect });
  return user;
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.password) throw new ApiError(400, 'Cannot change password for OAuth accounts');

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw new ApiError(401, 'Current password is incorrect');

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
};

export const getAllUsers = async (page: number, limit: number, search?: string, role?: Role) => {
  const where = {
    ...(search && { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }] }),
    ...(role && { role }),
  };
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, select: userSelect, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ]);
  return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const updateUserRole = async (userId: string, role: Role) => {
  return prisma.user.update({ where: { id: userId }, data: { role }, select: userSelect });
};

export const toggleUserStatus = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, 'User not found');
  return prisma.user.update({ where: { id: userId }, data: { isActive: !user.isActive }, select: userSelect });
};

export const getUserFavorites = async (userId: string) => {
  return prisma.favorite.findMany({
    where: { userId },
    include: { property: { include: { agent: { select: { id: true, name: true, email: true, avatar: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
};

export const toggleFavorite = async (userId: string, propertyId: string) => {
  const existing = await prisma.favorite.findUnique({ where: { userId_propertyId: { userId, propertyId } } });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return { favorited: false };
  }
  await prisma.favorite.create({ data: { userId, propertyId } });
  return { favorited: true };
};

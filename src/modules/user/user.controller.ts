import { Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { AuthRequest } from '../../middlewares/auth.middleware';
import {
  getUserById, updateProfile, changePassword, getAllUsers,
  updateUserRole, toggleUserStatus, getUserFavorites, toggleFavorite,
} from './user.service';
import { Role } from '@prisma/client';

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await getUserById(req.user!.userId);
  res.json(new ApiResponse(200, user, 'Profile fetched'));
});

export const updateProfileHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await updateProfile(req.user!.userId, req.body);
  res.json(new ApiResponse(200, user, 'Profile updated'));
});

export const changePasswordHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  await changePassword(req.user!.userId, currentPassword, newPassword);
  res.json(new ApiResponse(200, null, 'Password changed successfully'));
});

export const uploadAvatarHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { uploadImage } = await import('../../lib/cloudinary');
  if (!req.file) throw new Error('No file uploaded');
  const { url } = await uploadImage(req.file.buffer, 'avatars');
  const user = await updateProfile(req.user!.userId, { avatar: url });
  res.json(new ApiResponse(200, user, 'Avatar uploaded'));
});

export const getUsersHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, search, role } = req.query as {
    page?: string; limit?: string; search?: string; role?: string;
  };
  const result = await getAllUsers(
    parseInt(page || '1'), parseInt(limit || '10'), search, role as Role | undefined
  );
  res.json(new ApiResponse(200, result, 'Users fetched'));
});

export const updateRoleHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await updateUserRole(req.params.id as string, req.body.role as Role);
  res.json(new ApiResponse(200, user, 'Role updated'));
});

export const toggleStatusHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await toggleUserStatus(req.params.id as string);
  res.json(new ApiResponse(200, user, 'User status toggled'));
});

export const getFavoritesHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const favorites = await getUserFavorites(req.user!.userId);
  res.json(new ApiResponse(200, favorites, 'Favorites fetched'));
});

export const toggleFavoriteHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await toggleFavorite(req.user!.userId, req.params.propertyId as string);
  res.json(new ApiResponse(200, result, result.favorited ? 'Added to favorites' : 'Removed from favorites'));
});

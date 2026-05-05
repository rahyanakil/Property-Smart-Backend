import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { cookieOptions, refreshCookieOptions } from '../../utils/jwt';
import { config } from '../../config';
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  oauthLogin,
} from './auth.service';
import { AuthRequest } from '../../middlewares/auth.middleware';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await registerUser(req.body);
  res
    .cookie('accessToken', accessToken, cookieOptions)
    .cookie('refreshToken', refreshToken, refreshCookieOptions)
    .status(201)
    .json(new ApiResponse(201, { user, accessToken }, 'Registration successful'));
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await loginUser(req.body);
  res
    .cookie('accessToken', accessToken, cookieOptions)
    .cookie('refreshToken', refreshToken, refreshCookieOptions)
    .status(200)
    .json(new ApiResponse(200, { user, accessToken }, 'Login successful'));
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user) await logoutUser(req.user.userId);
  res
    .clearCookie('accessToken')
    .clearCookie('refreshToken')
    .json(new ApiResponse(200, null, 'Logged out successfully'));
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) throw new ApiError(401, 'Refresh token required');

  const { accessToken, refreshToken } = await refreshAccessToken(token);
  res
    .cookie('accessToken', accessToken, cookieOptions)
    .cookie('refreshToken', refreshToken, refreshCookieOptions)
    .json(new ApiResponse(200, { accessToken }, 'Token refreshed'));
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { prisma } = await import('../../lib/prisma');
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true, name: true, email: true, role: true,
      avatar: true, phone: true, bio: true, isVerified: true, createdAt: true,
    },
  });
  if (!user) throw new ApiError(404, 'User not found');
  res.json(new ApiResponse(200, user, 'User fetched'));
});

// Mock OAuth — in production, exchange code with provider
export const oauthCallback = asyncHandler(async (req: Request, res: Response) => {
  const { provider } = req.params as { provider: 'google' | 'github' };
  const { code } = req.query as { code: string };
  if (!code) throw new ApiError(400, 'Authorization code required');

  // Mock provider user data (replace with real OAuth exchange in production)
  const mockProviderUser = {
    id: `mock_${provider}_${Date.now()}`,
    email: `mockuser_${Date.now()}@example.com`,
    name: `Mock ${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
    avatar: `https://ui-avatars.com/api/?name=Mock+User`,
  };

  const { accessToken, refreshToken, user } = await oauthLogin(provider, mockProviderUser);

  res
    .cookie('accessToken', accessToken, cookieOptions)
    .cookie('refreshToken', refreshToken, refreshCookieOptions)
    .redirect(`${config.clientUrl}/auth/callback?token=${accessToken}&role=${user.role}`);
});

import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/ApiError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { RegisterInput, LoginInput } from './auth.schema';
import { Role } from '@prisma/client';

const SALT_ROUNDS = 12;

export const registerUser = async (input: RegisterInput) => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ApiError(409, 'Email already registered');

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: hashedPassword,
      role: input.role as Role,
    },
    select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true },
  });

  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

  return { user, accessToken, refreshToken };
};

export const loginUser = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.password) throw new ApiError(401, 'Invalid credentials');
  if (!user.isActive) throw new ApiError(403, 'Account is deactivated');

  const isMatch = await bcrypt.compare(input.password, user.password);
  if (!isMatch) throw new ApiError(401, 'Invalid credentials');

  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

  const { password: _pw, refreshToken: _rt, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken };
};

export const refreshAccessToken = async (token: string) => {
  const decoded = verifyRefreshToken(token);
  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

  if (!user || user.refreshToken !== token) throw new ApiError(401, 'Invalid refresh token');

  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const newRefreshToken = signRefreshToken(payload);

  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefreshToken } });

  return { accessToken, refreshToken: newRefreshToken };
};

export const logoutUser = async (userId: string) => {
  await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
};

export const oauthLogin = async (
  provider: 'google' | 'github',
  providerData: { id: string; email: string; name: string; avatar?: string }
) => {
  const providerField = provider === 'google' ? 'googleId' : 'githubId';

  let user = await prisma.user.findFirst({
    where: { OR: [{ [providerField]: providerData.id }, { email: providerData.email }] },
  });

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { [providerField]: providerData.id, avatar: providerData.avatar || user.avatar },
    });
  } else {
    user = await prisma.user.create({
      data: {
        [providerField]: providerData.id,
        email: providerData.email,
        name: providerData.name,
        avatar: providerData.avatar,
        isVerified: true,
      },
    });
  }

  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

  return { user, accessToken, refreshToken };
};

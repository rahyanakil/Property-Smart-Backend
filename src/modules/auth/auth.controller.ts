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
    .json(new ApiResponse(201, { user, accessToken, refreshToken }, 'Registration successful'));
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await loginUser(req.body);
  res
    .cookie('accessToken', accessToken, cookieOptions)
    .cookie('refreshToken', refreshToken, refreshCookieOptions)
    .status(200)
    .json(new ApiResponse(200, { user, accessToken, refreshToken }, 'Login successful'));
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user) await logoutUser(req.user.userId);
  const clearOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax' };
  res
    .clearCookie('accessToken', clearOpts)
    .clearCookie('refreshToken', clearOpts)
    .json(new ApiResponse(200, null, 'Logged out successfully'));
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) throw new ApiError(401, 'Refresh token required');

  const { accessToken, refreshToken } = await refreshAccessToken(token);
  res
    .cookie('accessToken', accessToken, cookieOptions)
    .cookie('refreshToken', refreshToken, refreshCookieOptions)
    .json(new ApiResponse(200, { accessToken, refreshToken }, 'Token refreshed'));
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

// Step 1 — redirect the browser to the provider's authorization page
export const oauthInitiate = asyncHandler(async (req: Request, res: Response) => {
  const { provider } = req.params as { provider: 'google' | 'github' };
  const callbackUrl = `${config.serverUrl}/api/v1/auth/oauth/${provider}/callback`;

  if (provider === 'google') {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', config.oauth.googleClientId);
    url.searchParams.set('redirect_uri', callbackUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'select_account');
    return res.redirect(url.toString());
  }

  if (provider === 'github') {
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', config.oauth.githubClientId);
    url.searchParams.set('redirect_uri', callbackUrl);
    url.searchParams.set('scope', 'user:email read:user');
    return res.redirect(url.toString());
  }

  throw new ApiError(400, `Unsupported OAuth provider: ${provider}`);
});

// Step 2 — provider redirects back here with ?code=; exchange it for real user data
export const oauthCallback = asyncHandler(async (req: Request, res: Response) => {
  const { provider } = req.params as { provider: 'google' | 'github' };
  const { code, error } = req.query as { code?: string; error?: string };

  // User denied permission on the provider's consent screen
  if (error) {
    return res.redirect(`${config.clientUrl}/login?error=oauth_denied`);
  }

  if (!code) throw new ApiError(400, 'Authorization code required');

  const callbackUrl = `${config.serverUrl}/api/v1/auth/oauth/${provider}/callback`;
  let providerUser: { id: string; email: string; name: string; avatar?: string };

  // ── Google ────────────────────────────────────────────────────────────────
  if (provider === 'google') {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: config.oauth.googleClientId,
        client_secret: config.oauth.googleClientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      throw new ApiError(401, 'Failed to obtain Google access token');
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const g = await userRes.json() as { id: string; email: string; name: string; picture?: string };

    providerUser = { id: g.id, email: g.email, name: g.name, avatar: g.picture };

  // ── GitHub ────────────────────────────────────────────────────────────────
  } else if (provider === 'github') {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: config.oauth.githubClientId,
        client_secret: config.oauth.githubClientSecret,
        code,
        redirect_uri: callbackUrl,
      }),
    });

    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      throw new ApiError(401, 'Failed to obtain GitHub access token');
    }

    const headers = {
      Authorization: `Bearer ${tokenData.access_token}`,
      'User-Agent': 'PropertySmart',
      Accept: 'application/json',
    };

    const userRes = await fetch('https://api.github.com/user', { headers });
    const gh = await userRes.json() as {
      id: number; login: string; name?: string; email?: string; avatar_url?: string;
    };

    // GitHub may hide the primary email — fetch it separately
    let email = gh.email ?? '';
    if (!email) {
      const emailRes = await fetch('https://api.github.com/user/emails', { headers });
      const emails = await emailRes.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
      email = emails.find(e => e.primary && e.verified)?.email ?? `${gh.login}@github.noreply`;
    }

    providerUser = {
      id: String(gh.id),
      email,
      name: gh.name || gh.login,
      avatar: gh.avatar_url,
    };

  } else {
    throw new ApiError(400, `Unsupported OAuth provider: ${provider}`);
  }

  const { accessToken, refreshToken, user } = await oauthLogin(provider, providerUser);

  // Pass tokens in the redirect so the frontend can store them in localStorage
  // (cross-origin cookies are blocked by modern browsers on Vercel)
  const dest = new URL(`${config.clientUrl}/auth/callback`);
  dest.searchParams.set('token', accessToken);
  dest.searchParams.set('refreshToken', refreshToken);
  dest.searchParams.set('role', user.role);

  res
    .cookie('accessToken', accessToken, cookieOptions)
    .cookie('refreshToken', refreshToken, refreshCookieOptions)
    .redirect(dest.toString());
});

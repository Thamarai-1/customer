import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { ResponseUtil } from '../../utils/apiResponse.js';
import { env } from '../../config/env.js';

const REFRESH_COOKIE_NAME = 'refreshToken';

const getCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: (env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);

      res.cookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, getCookieOptions());

      ResponseUtil.success(
        res,
        'Authentication successful',
        {
          user: result.user,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken
        },
        undefined,
        200
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'INVALID_CREDENTIALS') {
        ResponseUtil.error(res, 'Invalid email or password', 'INVALID_CREDENTIALS', undefined, 401);
        return;
      }
      if (message === 'ACCOUNT_INACTIVE') {
        ResponseUtil.error(res, 'Account is inactive. Please contact your administrator.', 'ACCOUNT_INACTIVE', undefined, 403);
        return;
      }
      ResponseUtil.error(res, 'Login failed', 'INTERNAL_SERVER_ERROR', undefined, 500);
    }
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    try {
      const token = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

      if (!token) {
        ResponseUtil.error(res, 'Refresh token required', 'UNAUTHENTICATED', undefined, 401);
        return;
      }

      const result = await AuthService.refreshTokens(token);
      res.cookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, getCookieOptions());

      ResponseUtil.success(
        res,
        'Token refreshed successfully',
        {
          user: result.user,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken
        },
        undefined,
        200
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.clearCookie(REFRESH_COOKIE_NAME);

      if (message === 'REFRESH_TOKEN_REUSE_DETECTED') {
        ResponseUtil.error(res, 'Security violation: Refresh token reuse detected. All sessions terminated.', 'SECURITY_ALERT', undefined, 401);
        return;
      }
      if (message === 'ACCOUNT_INACTIVE') {
        ResponseUtil.error(res, 'Account has been deactivated', 'ACCOUNT_INACTIVE', undefined, 403);
        return;
      }

      ResponseUtil.error(res, 'Invalid or expired refresh token', 'UNAUTHENTICATED', undefined, 401);
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    const token = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
    if (token) {
      await AuthService.logout(token);
    }
    res.clearCookie(REFRESH_COOKIE_NAME);
    ResponseUtil.success(res, 'Logged out successfully', undefined, undefined, 200);
  }

  static async me(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      ResponseUtil.error(res, 'Not authenticated', 'UNAUTHENTICATED', undefined, 401);
      return;
    }
    ResponseUtil.success(res, 'Current user profile retrieved', { user: req.user }, undefined, 200);
  }

  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        ResponseUtil.error(res, 'Not authenticated', 'UNAUTHENTICATED', undefined, 401);
        return;
      }

      const { currentPassword, newPassword } = req.body;
      await AuthService.changePassword(req.user.id, currentPassword, newPassword);

      res.clearCookie(REFRESH_COOKIE_NAME);
      ResponseUtil.success(
        res,
        'Password changed successfully. Please log in again with your new credentials.',
        undefined,
        undefined,
        200
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'INVALID_CURRENT_PASSWORD') {
        ResponseUtil.error(res, 'Current password verification failed', 'INVALID_CREDENTIALS', undefined, 400);
        return;
      }
      ResponseUtil.error(res, 'Password change failed', 'INTERNAL_SERVER_ERROR', undefined, 500);
    }
  }
}

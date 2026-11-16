import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token.js';
import { UserModel, UserRole } from '../modules/users/user.model.js';
import { ResponseUtil } from '../utils/apiResponse.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // 1. Check Authorization header: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.cookies && req.cookies.accessToken) {
      // 2. Optional fallback to HttpOnly accessToken cookie
      token = req.cookies.accessToken;
    }

    if (!token) {
      ResponseUtil.error(res, 'Authentication required. No token provided.', 'UNAUTHENTICATED', undefined, 401);
      return;
    }

    // Verify token
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err: unknown) {
      const isExpired = err instanceof Error && err.name === 'TokenExpiredError';
      ResponseUtil.error(
        res,
        isExpired ? 'Access token expired' : 'Invalid access token',
        'UNAUTHENTICATED',
        undefined,
        401
      );
      return;
    }

    // Verify user exists and is active in database
    const user = await UserModel.findById(payload.userId).select('name email role isActive');
    if (!user) {
      ResponseUtil.error(res, 'Authenticated user no longer exists', 'UNAUTHENTICATED', undefined, 401);
      return;
    }

    if (!user.isActive) {
      ResponseUtil.error(res, 'User account has been deactivated', 'ACCOUNT_INACTIVE', undefined, 401);
      return;
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name
    };

    next();
  } catch (error) {
    ResponseUtil.error(res, 'Authentication processing failed', 'UNAUTHENTICATED', undefined, 401);
  }
};

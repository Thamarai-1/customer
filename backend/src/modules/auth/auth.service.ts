import crypto from 'crypto';
import { UserModel, IUser, UserRole } from '../users/user.model.js';
import { RefreshTokenModel } from './refresh-token.model.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../../utils/token.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    lastLoginAt?: Date;
  };
  tokens: AuthTokens;
}

export class AuthService {
  /**
   * Authenticate user with email and password
   */
  static async login(email: string, candidatePassword: string): Promise<AuthResult> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await UserModel.findOne({ email: normalizedEmail }).select('+passwordHash');

    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new Error('ACCOUNT_INACTIVE');
    }

    const isMatch = await comparePassword(candidatePassword, user.passwordHash);
    if (!isMatch) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Update lastLoginAt
    user.lastLoginAt = new Date();
    await user.save();

    // Generate tokens & store refresh token
    const tokens = await this.issueTokens(user);

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt
      },
      tokens
    };
  }

  /**
   * Secure Refresh Token Rotation with reuse detection
   */
  static async refreshTokens(rawRefreshToken: string): Promise<AuthResult> {
    let payload;
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    if (!payload.tokenId) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    const tokenDoc = await RefreshTokenModel.findOne({ tokenId: payload.tokenId });

    if (!tokenDoc) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    // Reuse detection: If token was already revoked, someone is replaying a stolen token!
    if (tokenDoc.isRevoked) {
      logger.warn(`Refresh token reuse detected for user ${tokenDoc.userId}! Revoking all sessions.`, 'AuthService');
      await RefreshTokenModel.updateMany({ userId: tokenDoc.userId }, { isRevoked: true });
      throw new Error('REFRESH_TOKEN_REUSE_DETECTED');
    }

    // Verify user is still active
    const user = await UserModel.findById(tokenDoc.userId);
    if (!user || !user.isActive) {
      throw new Error('ACCOUNT_INACTIVE');
    }

    // Invalidate current refresh token and link to replacement
    const newTokenId = crypto.randomUUID();
    tokenDoc.isRevoked = true;
    tokenDoc.replacedByTokenId = newTokenId;
    await tokenDoc.save();

    // Create new refresh token doc
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await RefreshTokenModel.create({
      userId: user._id,
      tokenId: newTokenId,
      expiresAt,
      isRevoked: false
    });

    const userPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    };

    const newAccessToken = generateAccessToken(userPayload);
    const newRefreshToken = generateRefreshToken({ ...userPayload, tokenId: newTokenId });

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt
      },
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    };
  }

  /**
   * Revoke active refresh token on logout
   */
  static async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;

    try {
      const payload = verifyRefreshToken(rawRefreshToken);
      if (payload.tokenId) {
        await RefreshTokenModel.updateOne({ tokenId: payload.tokenId }, { isRevoked: true });
      }
    } catch {
      // Ignored: Token already invalid or expired
    }
  }

  /**
   * Change user password and invalidate previous sessions
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await UserModel.findById(userId).select('+passwordHash');
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new Error('INVALID_CURRENT_PASSWORD');
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    // Revoke all previous refresh tokens for security
    await RefreshTokenModel.updateMany({ userId: user._id }, { isRevoked: true });
  }

  /**
   * Helper to issue access and refresh tokens
   */
  private static async issueTokens(user: IUser): Promise<AuthTokens> {
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await RefreshTokenModel.create({
      userId: user._id,
      tokenId,
      expiresAt,
      isRevoked: false
    });

    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ ...payload, tokenId });

    return { accessToken, refreshToken };
  }

  /**
   * Bootstrap Initial Admin User (Task 1.4)
   */
  static async bootstrapAdmin(): Promise<void> {
    const adminEmail = env.ADMIN_EMAIL.toLowerCase().trim();
    const existingAdmin = await UserModel.findOne({
      $or: [{ role: UserRole.ADMIN }, { email: adminEmail }]
    });

    if (existingAdmin) {
      logger.info('Admin user already exists. Skipping bootstrap.', 'AuthService');
      return;
    }

    const hashedPassword = await hashPassword(env.ADMIN_PASSWORD);
    await UserModel.create({
      name: env.ADMIN_NAME,
      email: adminEmail,
      passwordHash: hashedPassword,
      role: UserRole.ADMIN,
      isActive: true
    });

    logger.info(`Initial admin bootstrapped: ${adminEmail}`, 'AuthService');
  }
}

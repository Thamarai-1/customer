import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface UserTokenPayload {
  userId: string;
  email: string;
  role: string;
  tokenId?: string;
}

export const generateAccessToken = (payload: UserTokenPayload): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
};

export const generateRefreshToken = (payload: UserTokenPayload): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn']
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
};

export const verifyAccessToken = (token: string): UserTokenPayload => {
  return jwt.verify(token, env.JWT_SECRET) as UserTokenPayload;
};

export const verifyRefreshToken = (token: string): UserTokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as UserTokenPayload;
};

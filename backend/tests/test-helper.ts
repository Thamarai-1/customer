import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { UserModel, UserRole, IUser } from '../src/modules/users/user.model.js';
import { hashPassword } from '../src/utils/password.js';
import { generateAccessToken, generateRefreshToken } from '../src/utils/token.js';

let mongod: MongoMemoryServer | null = null;

export const startTestDatabase = async (): Promise<string> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  return uri;
};

export const stopTestDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
};

export const clearTestDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0 && mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
};

export const createTestUser = async (
  role: UserRole = UserRole.MARKETING_MANAGER,
  email = 'test@example.com',
  password = 'Password123!',
  isActive = true
): Promise<{ user: IUser; accessToken: string; refreshToken: string }> => {
  const passwordHash = await hashPassword(password);
  const user = await UserModel.create({
    name: 'Test Operator',
    email: email.toLowerCase().trim(),
    passwordHash,
    role,
    isActive
  });

  const payload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ ...payload, tokenId: 'test-token-id' });

  return { user, accessToken, refreshToken };
};

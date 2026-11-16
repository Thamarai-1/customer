import { UserModel, IUser, UserRole } from './user.model.js';
import { RefreshTokenModel } from '../auth/refresh-token.model.js';
import { hashPassword } from '../../utils/password.js';
import { getPaginationMeta, PaginationQueryOptions } from '../../utils/pagination.js';
import { PaginationMeta } from '../../types/index.js';

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department?: string;
}

export interface UpdateUserData {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
  department?: string;
}

export class UserService {
  static async createUser(data: CreateUserData): Promise<IUser> {
    const normalizedEmail = data.email.toLowerCase().trim();
    const existing = await UserModel.findOne({ email: normalizedEmail });
    if (existing) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await hashPassword(data.password);
    const user = await UserModel.create({
      name: data.name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: data.role,
      department: data.department?.trim(),
      isActive: true
    });

    return user;
  }

  static async listUsers(
    options: PaginationQueryOptions
  ): Promise<{ users: IUser[]; meta: PaginationMeta }> {
    const filter: Record<string, unknown> = {};

    if (options.search) {
      const regex = new RegExp(options.search, 'i');
      filter.$or = [{ name: regex }, { email: regex }, { department: regex }];
    }

    const [users, totalRecords] = await Promise.all([
      UserModel.find(filter)
        .sort({ [options.sortBy]: options.sortOrder })
        .skip(options.skip)
        .limit(options.limit)
        .lean(),
      UserModel.countDocuments(filter)
    ]);

    const meta = getPaginationMeta(totalRecords, options.page, options.limit);
    return { users: users as unknown as IUser[], meta };
  }

  static async getUserById(id: string): Promise<IUser | null> {
    return UserModel.findById(id);
  }

  static async updateUser(id: string, data: UpdateUserData): Promise<IUser | null> {
    const user = await UserModel.findById(id);
    if (!user) {
      return null;
    }

    if (data.name !== undefined) user.name = data.name.trim();
    if (data.role !== undefined) user.role = data.role;
    if (data.isActive !== undefined) user.isActive = data.isActive;
    if (data.department !== undefined) user.department = data.department.trim();

    await user.save();

    // If deactivated, revoke all refresh tokens
    if (data.isActive === false) {
      await RefreshTokenModel.updateMany({ userId: user._id }, { isRevoked: true });
    }

    return user;
  }

  static async deactivateUser(id: string): Promise<IUser | null> {
    return this.updateUser(id, { isActive: false });
  }
}

import mongoose, { Schema, Document, Model } from 'mongoose';

export enum UserRole {
  ADMIN = 'ADMIN',
  MARKETING_MANAGER = 'MARKETING_MANAGER',
  COMPLIANCE_REVIEWER = 'COMPLIANCE_REVIEWER'
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
  department?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false // Protected from accidental exposure
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.MARKETING_MANAGER,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    department: {
      type: String,
      trim: true
    },
    lastLoginAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    collection: 'users',
    toJSON: {
      transform(_doc, ret) {
        delete (ret as Record<string, unknown>).passwordHash;
        return ret;
      }
    }
  }
);

export const UserModel: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

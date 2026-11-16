import mongoose, { Schema, Document, Model } from 'mongoose';

export enum UserRole {
  ADMIN = 'admin',
  REVIEWER = 'reviewer',
  AGENT = 'agent',
  COMPLIANCE_OFFICER = 'compliance_officer'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

export interface IUser extends Document {
  email: string;
  name: string;
  passwordHash?: string;
  role: UserRole;
  status: UserStatus;
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
      select: false // Protected from accidental exposure
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.REVIEWER,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
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
    collection: 'users'
  }
);

export const UserModel: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

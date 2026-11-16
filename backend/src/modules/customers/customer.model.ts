import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export enum CustomerType {
  RETAIL = 'RETAIL',
  TELECOM = 'TELECOM',
  ENTERPRISE = 'ENTERPRISE',
  INDIVIDUAL = 'INDIVIDUAL'
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED'
}

export enum LoyaltyTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM'
}

export enum PlanStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export interface ILoyaltyInfo {
  loyaltyTier: LoyaltyTier;
  loyaltyPoints: number;
  membershipStartDate: Date;
}

export interface ISubscriptionInfo {
  activePlan: string;
  planType: string;
  planStatus: PlanStatus;
  planStartDate: Date;
  planEndDate?: Date;
}

export interface ICustomer extends Document {
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  customerType: CustomerType;
  accountStatus: AccountStatus;
  loyaltyInfo: ILoyaltyInfo;
  subscription: ISubscriptionInfo;
  source: string;
  assignedSegmentId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LoyaltyInfoSchema = new Schema<ILoyaltyInfo>(
  {
    loyaltyTier: {
      type: String,
      enum: Object.values(LoyaltyTier),
      default: LoyaltyTier.BRONZE,
      required: true
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0
    },
    membershipStartDate: {
      type: Date,
      default: Date.now,
      required: true
    }
  },
  { _id: false }
);

const SubscriptionInfoSchema = new Schema<ISubscriptionInfo>(
  {
    activePlan: {
      type: String,
      required: true,
      trim: true
    },
    planType: {
      type: String,
      default: 'Postpaid',
      trim: true
    },
    planStatus: {
      type: String,
      enum: Object.values(PlanStatus),
      default: PlanStatus.ACTIVE,
      required: true
    },
    planStartDate: {
      type: Date,
      default: Date.now,
      required: true
    },
    planEndDate: {
      type: Date
    }
  },
  { _id: false }
);

const CustomerSchema = new Schema<ICustomer>(
  {
    customerId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    phone: {
      type: String,
      trim: true
    },
    customerType: {
      type: String,
      enum: Object.values(CustomerType),
      default: CustomerType.RETAIL,
      required: true,
      index: true
    },
    accountStatus: {
      type: String,
      enum: Object.values(AccountStatus),
      default: AccountStatus.ACTIVE,
      required: true,
      index: true
    },
    loyaltyInfo: {
      type: LoyaltyInfoSchema,
      required: true,
      default: () => ({
        loyaltyTier: LoyaltyTier.BRONZE,
        loyaltyPoints: 0,
        membershipStartDate: new Date()
      })
    },
    subscription: {
      type: SubscriptionInfoSchema,
      required: true,
      default: () => ({
        activePlan: 'Standard',
        planType: 'Postpaid',
        planStatus: PlanStatus.ACTIVE,
        planStartDate: new Date()
      })
    },
    source: {
      type: String,
      default: 'MANUAL',
      trim: true
    },
    assignedSegmentId: {
      type: Schema.Types.ObjectId,
      ref: 'CustomerSegment',
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'customers'
  }
);

// Compound and text indexes for fast queries
CustomerSchema.index({ accountStatus: 1, 'loyaltyInfo.loyaltyTier': 1 });
CustomerSchema.index({ 'subscription.activePlan': 1, 'subscription.planStatus': 1 });
CustomerSchema.index({ firstName: 'text', lastName: 'text', email: 'text', customerId: 'text' });

export const CustomerModel: Model<ICustomer> =
  mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);

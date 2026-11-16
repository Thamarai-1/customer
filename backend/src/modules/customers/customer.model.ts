import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export enum CustomerStatus {
  ACTIVE = 'active',
  DORMANT = 'dormant',
  AT_RISK = 'at_risk',
  CHURNED = 'churned'
}

export enum LoyaltyTier {
  STANDARD = 'standard',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum'
}

export enum IndustryType {
  RETAIL = 'retail',
  TELECOM = 'telecom'
}

export interface IPlanDetails {
  planName: string;
  monthlyFee: number;
  currency: string;
  startDate: Date;
  contractTermMonths?: number;
}

export interface ICustomer extends Document {
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  industry: IndustryType;
  status: CustomerStatus;
  loyaltyTier: LoyaltyTier;
  loyaltyPoints: number;
  tenureMonths: number;
  planDetails?: IPlanDetails;
  assignedSegmentId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PlanDetailsSchema = new Schema<IPlanDetails>(
  {
    planName: { type: String, required: true },
    monthlyFee: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    startDate: { type: Date, required: true },
    contractTermMonths: { type: Number }
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
      lowercase: true,
      trim: true,
      index: true
    },
    phone: {
      type: String,
      trim: true
    },
    industry: {
      type: String,
      enum: Object.values(IndustryType),
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(CustomerStatus),
      default: CustomerStatus.ACTIVE,
      index: true
    },
    loyaltyTier: {
      type: String,
      enum: Object.values(LoyaltyTier),
      default: LoyaltyTier.STANDARD,
      index: true
    },
    loyaltyPoints: {
      type: Number,
      default: 0
    },
    tenureMonths: {
      type: Number,
      default: 0
    },
    planDetails: {
      type: PlanDetailsSchema
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

CustomerSchema.index({ email: 1, industry: 1 });
CustomerSchema.index({ status: 1, loyaltyTier: 1 });

export const CustomerModel: Model<ICustomer> =
  mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);

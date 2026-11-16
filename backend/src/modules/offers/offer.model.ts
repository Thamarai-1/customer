import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { LoyaltyTier } from '../customers/customer.model.js';

export enum OfferType {
  DISCOUNT = 'discount',
  BONUS_POINTS = 'bonus_points',
  DATA_BOOSTER = 'data_booster',
  PLAN_UPGRADE = 'plan_upgrade',
  GIFT_VOUCHER = 'gift_voucher',
  FEE_WAIVER = 'fee_waiver'
}

export interface IOffer extends Document {
  offerCode: string;
  title: string;
  description: string;
  offerType: OfferType;
  value: number;
  currency?: string;
  termsAndConditions: string;
  eligibleSegments: Types.ObjectId[];
  eligibleLoyaltyTiers: LoyaltyTier[];
  minTenureMonths: number;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  maxRedemptionsPerCustomer: number;
  createdAt: Date;
  updatedAt: Date;
}

const OfferSchema = new Schema<IOffer>(
  {
    offerCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    offerType: {
      type: String,
      enum: Object.values(OfferType),
      required: true,
      index: true
    },
    value: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    termsAndConditions: {
      type: String,
      required: true
    },
    eligibleSegments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'CustomerSegment'
      }
    ],
    eligibleLoyaltyTiers: [
      {
        type: String,
        enum: Object.values(LoyaltyTier)
      }
    ],
    minTenureMonths: {
      type: Number,
      default: 0
    },
    validFrom: {
      type: Date,
      required: true
    },
    validUntil: {
      type: Date,
      required: true,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    maxRedemptionsPerCustomer: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: true,
    collection: 'offers'
  }
);

OfferSchema.index({ isActive: 1, validUntil: 1 });

export const OfferModel: Model<IOffer> =
  mongoose.models.Offer || mongoose.model<IOffer>('Offer', OfferSchema);

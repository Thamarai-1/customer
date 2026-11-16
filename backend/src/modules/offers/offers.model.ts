import mongoose, { Schema, Document, Model } from 'mongoose';
import { OfferType, OfferStatus, OfferValueType, IOfferEligibilityRules } from './offers.types.js';
import { CustomerSegmentType } from '../segmentation/segmentation.constants.js';

export interface IOfferDocument extends Document {
  offerCode: string;
  name: string;
  description: string;
  offerType: OfferType;
  value: number;
  valueType: OfferValueType;
  currency: string | null;
  targetSegments: CustomerSegmentType[];
  eligibilityRules: IOfferEligibilityRules;
  validFrom: Date;
  validUntil: Date;
  allowedChannels: string[];
  termsAndConditions: string[];
  status: OfferStatus;
  maxRedemptions: number;
  currentRedemptions: number;
  createdAt: Date;
  updatedAt: Date;
}

const OfferEligibilityRulesSchema = new Schema<IOfferEligibilityRules>(
  {
    minimumLoyaltyPoints: { type: Number, default: 0 },
    minimumMembershipDays: { type: Number, default: 0 },
    requiredLoyaltyTiers: { type: [String], default: [] },
    requiredAccountStatus: { type: String, default: 'ACTIVE' },
    requiredPlanStatus: { type: String, default: 'ACTIVE' },
    requiredPlanType: { type: String },
    maxOverdueBalance: { type: Number, default: 0 },
    maxDaysOverdue: { type: Number, default: 0 }
  },
  { _id: false }
);

const OfferSchema = new Schema<IOfferDocument>(
  {
    offerCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    name: {
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
    valueType: {
      type: String,
      enum: Object.values(OfferValueType),
      default: OfferValueType.FIXED_AMOUNT
    },
    currency: {
      type: String,
      default: 'USD'
    },
    targetSegments: {
      type: [String],
      enum: Object.values(CustomerSegmentType),
      default: [],
      index: true
    },
    eligibilityRules: {
      type: OfferEligibilityRulesSchema,
      default: () => ({})
    },
    validFrom: {
      type: Date,
      required: true,
      index: true
    },
    validUntil: {
      type: Date,
      required: true,
      index: true
    },
    allowedChannels: {
      type: [String],
      default: ['EMAIL']
    },
    termsAndConditions: {
      type: [String],
      default: ['Valid for eligible accounts only. Subject to promotional terms.']
    },
    status: {
      type: String,
      enum: Object.values(OfferStatus),
      default: OfferStatus.DRAFT,
      index: true
    },
    maxRedemptions: {
      type: Number,
      default: 1000
    },
    currentRedemptions: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    collection: 'offers'
  }
);

OfferSchema.index({ status: 1, validFrom: 1, validUntil: 1 });
OfferSchema.index({ targetSegments: 1, status: 1 });

export const OfferModel: Model<IOfferDocument> =
  mongoose.models.Offer || mongoose.model<IOfferDocument>('Offer', OfferSchema);

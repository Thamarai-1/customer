import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export enum CampaignStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

export interface ICampaign extends Document {
  campaignCode: string;
  name: string;
  description: string;
  targetSegmentRef: Types.ObjectId;
  associatedOfferRef?: Types.ObjectId;
  status: CampaignStatus;
  startDate: Date;
  endDate: Date;
  toneGuideline: string;
  mandatoryDisclaimers: string[];
  blockedKeywords: string[];
  budgetTotal?: number;
  totalTargetedCustomers: number;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    campaignCode: {
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
    targetSegmentRef: {
      type: Schema.Types.ObjectId,
      ref: 'CustomerSegment',
      required: true,
      index: true
    },
    associatedOfferRef: {
      type: Schema.Types.ObjectId,
      ref: 'Offer'
    },
    status: {
      type: String,
      enum: Object.values(CampaignStatus),
      default: CampaignStatus.DRAFT,
      index: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    toneGuideline: {
      type: String,
      required: true
    },
    mandatoryDisclaimers: {
      type: [String],
      default: []
    },
    blockedKeywords: {
      type: [String],
      default: []
    },
    budgetTotal: {
      type: Number
    },
    totalTargetedCustomers: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    collection: 'campaigns'
  }
);

export const CampaignModel: Model<ICampaign> =
  mongoose.models.Campaign || mongoose.model<ICampaign>('Campaign', CampaignSchema);

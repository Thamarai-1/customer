import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { CampaignStatus, CampaignObjective } from './campaigns.types.js';
import { CustomerSegmentType } from '../segmentation/segmentation.constants.js';

export interface ICampaignDocument extends Document {
  campaignCode: string;
  name: string;
  description: string;
  objective: CampaignObjective;
  targetSegments: CustomerSegmentType[];
  status: CampaignStatus;
  startDate: Date;
  endDate: Date;
  allowedChannels: string[];
  offerIds: Types.ObjectId[];
  priority: number;
  toneGuideline: string;
  mandatoryDisclaimers: string[];
  blockedKeywords: string[];
  budgetTotal?: number;
  totalTargetedCustomers: number;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaignDocument>(
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
    objective: {
      type: String,
      enum: Object.values(CampaignObjective),
      default: CampaignObjective.CUSTOMER_ENGAGEMENT,
      required: true,
      index: true
    },
    targetSegments: {
      type: [String],
      enum: Object.values(CustomerSegmentType),
      default: [],
      index: true
    },
    status: {
      type: String,
      enum: Object.values(CampaignStatus),
      default: CampaignStatus.DRAFT,
      index: true
    },
    startDate: {
      type: Date,
      required: true,
      index: true
    },
    endDate: {
      type: Date,
      required: true,
      index: true
    },
    allowedChannels: {
      type: [String],
      default: ['EMAIL']
    },
    offerIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Offer'
      }
    ],
    priority: {
      type: Number,
      default: 1,
      index: true
    },
    toneGuideline: {
      type: String,
      default: 'Warm, professional and appreciative'
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

CampaignSchema.index({ status: 1, startDate: 1, endDate: 1 });
CampaignSchema.index({ targetSegments: 1, status: 1 });

export const CampaignModel: Model<ICampaignDocument> =
  mongoose.models.Campaign || mongoose.model<ICampaignDocument>('Campaign', CampaignSchema);

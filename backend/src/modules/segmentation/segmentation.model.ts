import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { CustomerSegmentType, ClassificationStatus, ReasonCode } from './segmentation.constants.js';
import { ISegmentationEvidence, ISegmentationConfig } from './segmentation.types.js';

// Export CustomerSegmentModel from Phase 1 catalog
export { CustomerSegmentModel, ICustomerSegment } from './customer-segment.model.js';

// -------------------------------------------------------------
// 1. Current Customer Classification Model (Latest snapshot)
// -------------------------------------------------------------
export interface ICustomerClassification extends Document {
  customerId: string;
  customerRef: Types.ObjectId;
  primarySegment: CustomerSegmentType | null;
  segments: CustomerSegmentType[];
  classificationStatus: ClassificationStatus;
  confidence: number;
  reasonCodes: ReasonCode[];
  explanations: string[];
  evidence: ISegmentationEvidence;
  ruleVersion: string;
  classifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerClassificationSchema = new Schema<ICustomerClassification>(
  {
    customerId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    customerRef: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true
    },
    primarySegment: {
      type: String,
      enum: [...Object.values(CustomerSegmentType), null],
      default: null,
      index: true
    },
    segments: {
      type: [String],
      enum: Object.values(CustomerSegmentType),
      default: [],
      index: true
    },
    classificationStatus: {
      type: String,
      enum: Object.values(ClassificationStatus),
      default: ClassificationStatus.UNCLASSIFIED,
      index: true
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 1.0,
      index: true
    },
    reasonCodes: {
      type: [String],
      enum: Object.values(ReasonCode),
      default: []
    },
    explanations: {
      type: [String],
      default: []
    },
    evidence: {
      type: Schema.Types.Mixed,
      required: true
    },
    ruleVersion: {
      type: String,
      required: true,
      default: '1.0.0'
    },
    classifiedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'customer_classifications'
  }
);

// Compound indexes for analytical queries and segment filtering
CustomerClassificationSchema.index({ primarySegment: 1, confidence: -1 });
CustomerClassificationSchema.index({ classificationStatus: 1, classifiedAt: -1 });
CustomerClassificationSchema.index({ segments: 1, confidence: -1 });

export const CustomerClassificationModel: Model<ICustomerClassification> =
  mongoose.models.CustomerClassification ||
  mongoose.model<ICustomerClassification>('CustomerClassification', CustomerClassificationSchema);

// -------------------------------------------------------------
// 2. Customer Classification History Model (Immutable audit log)
// -------------------------------------------------------------
export interface ICustomerClassificationHistory extends Document {
  customerId: string;
  customerRef: Types.ObjectId;
  primarySegment: CustomerSegmentType | null;
  segments: CustomerSegmentType[];
  classificationStatus: ClassificationStatus;
  confidence: number;
  reasonCodes: ReasonCode[];
  explanations: string[];
  evidence: ISegmentationEvidence;
  ruleVersion: string;
  classifiedAt: Date;
  createdAt: Date;
}

const CustomerClassificationHistorySchema = new Schema<ICustomerClassificationHistory>(
  {
    customerId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true
    },
    customerRef: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },
    primarySegment: {
      type: String,
      enum: [...Object.values(CustomerSegmentType), null],
      default: null
    },
    segments: {
      type: [String],
      enum: Object.values(CustomerSegmentType),
      default: []
    },
    classificationStatus: {
      type: String,
      enum: Object.values(ClassificationStatus),
      required: true
    },
    confidence: {
      type: Number,
      required: true
    },
    reasonCodes: {
      type: [String],
      default: []
    },
    explanations: {
      type: [String],
      default: []
    },
    evidence: {
      type: Schema.Types.Mixed,
      required: true
    },
    ruleVersion: {
      type: String,
      required: true
    },
    classifiedAt: {
      type: Date,
      required: true,
      default: Date.now
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'customer_classification_history'
  }
);

CustomerClassificationHistorySchema.index({ customerId: 1, classifiedAt: -1 });

export const CustomerClassificationHistoryModel: Model<ICustomerClassificationHistory> =
  mongoose.models.CustomerClassificationHistory ||
  mongoose.model<ICustomerClassificationHistory>('CustomerClassificationHistory', CustomerClassificationHistorySchema);

// -------------------------------------------------------------
// 3. Segmentation Config Model (Dynamic configurable rules)
// -------------------------------------------------------------
export interface ISegmentationConfigDocument extends Document, ISegmentationConfig {
  isActive: boolean;
  createdAt: Date;
}

const SegmentationConfigSchema = new Schema<ISegmentationConfigDocument>(
  {
    ruleVersion: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    activityObservationDays: {
      type: Number,
      required: true,
      default: 30
    },
    previousActivityComparisonDays: {
      type: Number,
      required: true,
      default: 30
    },
    activityReductionThresholdPercent: {
      type: Number,
      required: true,
      default: 50
    },
    minBaselineActivityCount: {
      type: Number,
      required: true,
      default: 3
    },
    inactivityThresholdDays: {
      type: Number,
      required: true,
      default: 60
    },
    minTotalActivitiesForHistory: {
      type: Number,
      required: true,
      default: 2
    },
    loyaltyPointsThreshold: {
      type: Number,
      required: true,
      default: 1000
    },
    membershipDurationDaysThreshold: {
      type: Number,
      required: true,
      default: 180
    },
    consistentMinMonthlyActivities: {
      type: Number,
      required: true,
      default: 4
    },
    segmentPriority: {
      type: [String],
      enum: Object.values(CustomerSegmentType),
      default: Object.values(CustomerSegmentType)
    },
    updatedBy: {
      type: String,
      default: 'SYSTEM'
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true,
    collection: 'segmentation_configs'
  }
);

export const SegmentationConfigModel: Model<ISegmentationConfigDocument> =
  mongoose.models.SegmentationConfig ||
  mongoose.model<ISegmentationConfigDocument>('SegmentationConfig', SegmentationConfigSchema);

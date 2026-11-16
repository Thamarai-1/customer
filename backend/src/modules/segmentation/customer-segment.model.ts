import mongoose, { Schema, Document, Model } from 'mongoose';

export enum SegmentStrategy {
  APPRECIATION = 'appreciation',
  REWARD = 'reward',
  RE_ENGAGEMENT = 're_engagement',
  COURTEOUS_REMINDER = 'courteous_reminder',
  FIRMER_OVERDUE = 'firmer_overdue'
}

export enum CommunicationTone {
  WARM_APPRECIATIVE = 'warm_appreciative',
  VALUE_DRIVEN = 'value_driven',
  GENTLE_COURTEOUS = 'gentle_courteous',
  FIRM_PROFESSIONAL = 'firm_professional',
  URGENT_DIRECT = 'urgent_direct'
}

export interface ISegmentRuleCondition {
  field: string;
  operator: 'eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin';
  value: Schema.Types.Mixed;
}

export interface ICustomerSegment extends Document {
  segmentKey: string;
  name: string;
  description: string;
  strategy: SegmentStrategy;
  recommendedTone: CommunicationTone;
  rules: ISegmentRuleCondition[];
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

const SegmentRuleConditionSchema = new Schema<ISegmentRuleCondition>(
  {
    field: { type: String, required: true },
    operator: {
      type: String,
      enum: ['eq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin'],
      required: true
    },
    value: { type: Schema.Types.Mixed, required: true }
  },
  { _id: false }
);

const CustomerSegmentSchema = new Schema<ICustomerSegment>(
  {
    segmentKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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
    strategy: {
      type: String,
      enum: Object.values(SegmentStrategy),
      required: true,
      index: true
    },
    recommendedTone: {
      type: String,
      enum: Object.values(CommunicationTone),
      required: true
    },
    rules: {
      type: [SegmentRuleConditionSchema],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    priority: {
      type: Number,
      default: 100
    }
  },
  {
    timestamps: true,
    collection: 'customer_segments'
  }
);

export const CustomerSegmentModel: Model<ICustomerSegment> =
  mongoose.models.CustomerSegment ||
  mongoose.model<ICustomerSegment>('CustomerSegment', CustomerSegmentSchema);

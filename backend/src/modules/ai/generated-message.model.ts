import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export enum MessageGenerationStatus {
  DRAFT = 'draft',
  VALIDATED = 'validated',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DISPATCHED = 'dispatched'
}

export interface IGroundingFact {
  factKey: string;
  sourceField: string;
  verifiedValue: string;
}

export interface IGeneratedMessage extends Document {
  customerRef: Types.ObjectId;
  customerId: string;
  campaignRef?: Types.ObjectId;
  segmentRef?: Types.ObjectId;
  subject: string;
  body: string;
  llmProvider: string;
  modelIdentifier: string;
  templateVersion: string;
  groundingFacts: IGroundingFact[];
  status: MessageGenerationStatus;
  toneApplied: string;
  createdAt: Date;
  updatedAt: Date;
}

const GroundingFactSchema = new Schema<IGroundingFact>(
  {
    factKey: { type: String, required: true },
    sourceField: { type: String, required: true },
    verifiedValue: { type: String, required: true }
  },
  { _id: false }
);

const GeneratedMessageSchema = new Schema<IGeneratedMessage>(
  {
    customerRef: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true
    },
    customerId: {
      type: String,
      required: true,
      index: true
    },
    campaignRef: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      index: true
    },
    segmentRef: {
      type: Schema.Types.ObjectId,
      ref: 'CustomerSegment',
      index: true
    },
    subject: {
      type: String,
      required: true
    },
    body: {
      type: String,
      required: true
    },
    llmProvider: {
      type: String,
      required: true
    },
    modelIdentifier: {
      type: String,
      required: true
    },
    templateVersion: {
      type: String,
      required: true,
      default: 'v1.0.0'
    },
    groundingFacts: {
      type: [GroundingFactSchema],
      default: []
    },
    status: {
      type: String,
      enum: Object.values(MessageGenerationStatus),
      default: MessageGenerationStatus.DRAFT,
      index: true
    },
    toneApplied: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'generated_messages'
  }
);

GeneratedMessageSchema.index({ customerRef: 1, status: 1 });

export const GeneratedMessageModel: Model<IGeneratedMessage> =
  mongoose.models.GeneratedMessage ||
  mongoose.model<IGeneratedMessage>('GeneratedMessage', GeneratedMessageSchema);

import mongoose, { Schema } from 'mongoose';
import { IGeneratedMessage, IGeneratedMessageDocument } from './message-generation.types.js';
import { MessageGenerationStatus, GroundingStatus } from './message-generation.constants.js';
import { CustomerSegmentType } from '../segmentation/segmentation.constants.js';

const FindingSchema = new Schema(
  {
    rule: { type: String, required: true },
    severity: { type: String, enum: ['ERROR', 'WARNING'], required: true },
    message: { type: String, required: true },
    evidenceValue: { type: String },
    generatedValue: { type: String }
  },
  { _id: false }
);

const GeneratedMessageSchema = new Schema<IGeneratedMessage>(
  {
    customerId: {
      type: String,
      required: true,
      index: true,
      uppercase: true,
      trim: true
    },
    customerRef: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true
    },
    policyEvaluationId: {
      type: Schema.Types.ObjectId,
      ref: 'PolicyEvaluation',
      index: true
    },
    campaignRef: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      index: true
    },
    primarySegment: {
      type: String,
      enum: Object.values(CustomerSegmentType),
      required: true,
      index: true
    },
    objective: {
      type: String,
      required: true
    },
    channel: {
      type: String,
      default: 'EMAIL',
      uppercase: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    body: {
      type: String,
      required: true
    },
    referencedOffers: {
      type: [String],
      default: []
    },
    referencedBillingFacts: {
      type: [String],
      default: []
    },
    generationStatus: {
      type: String,
      enum: Object.values(MessageGenerationStatus),
      default: MessageGenerationStatus.GENERATED,
      index: true
    },
    groundingStatus: {
      type: String,
      enum: Object.values(GroundingStatus),
      default: GroundingStatus.PASSED,
      index: true
    },
    validationFindings: {
      type: [FindingSchema],
      default: []
    },
    provider: {
      type: String,
      required: true
    },
    model: {
      type: String,
      required: true
    },
    promptVersion: {
      type: String,
      required: true
    },
    tokenUsage: {
      promptTokens: { type: Number },
      completionTokens: { type: Number },
      totalTokens: { type: Number }
    },
    latencyMs: {
      type: Number,
      default: 0
    },
    retryCount: {
      type: Number,
      default: 0
    },
    evidenceSnapshot: {
      type: Schema.Types.Mixed,
      required: true
    },
    refusalReason: {
      type: String
    },
    generatedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'generated_messages'
  }
);

GeneratedMessageSchema.index({ customerId: 1, generatedAt: -1 });

export const GeneratedMessageModel = mongoose.model<IGeneratedMessage, mongoose.Model<IGeneratedMessage, {}, {}, {}, IGeneratedMessageDocument>>(
  'GeneratedMessage',
  GeneratedMessageSchema
);

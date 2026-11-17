import mongoose, { Schema, Model } from 'mongoose';
import { IDeliveryRecord, IDeliveryRecordDocument } from './delivery.types.js';
import { DeliveryMode, DeliveryStatus } from './delivery.constants.js';

const DeliveryRecordSchema = new Schema<IDeliveryRecord>(
  {
    generatedMessageId: {
      type: Schema.Types.ObjectId,
      ref: 'GeneratedMessage',
      required: true,
      index: true
    },
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
    messageVersion: {
      type: Number,
      required: true
    },
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: 'MessageReview',
      required: true,
      index: true
    },
    approvalActionId: {
      type: Schema.Types.ObjectId,
      ref: 'ReviewAction',
      required: true,
      index: true
    },
    complianceValidationId: {
      type: Schema.Types.ObjectId,
      ref: 'ComplianceValidation',
      required: true,
      index: true
    },
    campaignRef: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      index: true
    },
    channel: {
      type: String,
      required: true,
      default: 'EMAIL',
      uppercase: true
    },
    deliveryMode: {
      type: String,
      enum: Object.values(DeliveryMode),
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(DeliveryStatus),
      default: DeliveryStatus.PENDING,
      index: true
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    providerMessageId: {
      type: String,
      index: true
    },
    recipientMasked: {
      type: String,
      required: true
    },
    subject: {
      type: String,
      required: true
    },
    bodySnippet: {
      type: String,
      required: true
    },
    errorCode: {
      type: String
    },
    errorMessage: {
      type: String
    },
    metadata: {
      type: Schema.Types.Mixed
    },
    deliveredAt: {
      type: Date,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'delivery_records'
  }
);

DeliveryRecordSchema.index({ generatedMessageId: 1, messageVersion: 1, status: 1 });
DeliveryRecordSchema.index({ customerId: 1, createdAt: -1 });
DeliveryRecordSchema.index({ status: 1, createdAt: -1 });

export const DeliveryRecordModel: Model<IDeliveryRecordDocument> =
  (mongoose.models.DeliveryRecord as Model<IDeliveryRecordDocument>) ||
  mongoose.model<IDeliveryRecordDocument>('DeliveryRecord', DeliveryRecordSchema as any);

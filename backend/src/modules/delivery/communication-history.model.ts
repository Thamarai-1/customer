import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export enum DeliveryStatus {
  MOCK_DELIVERED = 'mock_delivered',
  SENT = 'sent',
  DELIVERED = 'delivered',
  BOUNCED = 'bounced',
  BLOCKED = 'blocked',
  FAILED = 'failed'
}

export interface ICommunicationHistory extends Document {
  customerRef: Types.ObjectId;
  customerId: string;
  generatedMessageRef?: Types.ObjectId;
  campaignRef?: Types.ObjectId;
  channel: string;
  recipient: string;
  subject: string;
  deliveryStatus: DeliveryStatus;
  blockReason?: string;
  providerMessageId?: string;
  dispatchMetadata?: Record<string, unknown>;
  sentAt: Date;
  createdAt: Date;
}

const CommunicationHistorySchema = new Schema<ICommunicationHistory>(
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
    generatedMessageRef: {
      type: Schema.Types.ObjectId,
      ref: 'GeneratedMessage',
      index: true
    },
    campaignRef: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      index: true
    },
    channel: {
      type: String,
      default: 'email'
    },
    recipient: {
      type: String,
      required: true
    },
    subject: {
      type: String,
      required: true
    },
    deliveryStatus: {
      type: String,
      enum: Object.values(DeliveryStatus),
      default: DeliveryStatus.MOCK_DELIVERED,
      index: true
    },
    blockReason: {
      type: String
    },
    providerMessageId: {
      type: String
    },
    dispatchMetadata: {
      type: Schema.Types.Mixed
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'communication_history'
  }
);

CommunicationHistorySchema.index({ customerRef: 1, sentAt: -1 });

export const CommunicationHistoryModel: Model<ICommunicationHistory> =
  mongoose.models.CommunicationHistory ||
  mongoose.model<ICommunicationHistory>('CommunicationHistory', CommunicationHistorySchema);

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export enum ActivityType {
  PURCHASE = 'purchase',
  SUPPORT_TICKET = 'support_ticket',
  PLAN_CHANGE = 'plan_change',
  USAGE_SURGE = 'usage_surge',
  PORTAL_LOGIN = 'portal_login',
  INQUIRY = 'inquiry'
}

export enum ActivityChannel {
  WEB = 'web',
  MOBILE_APP = 'mobile_app',
  STORE = 'store',
  CALL_CENTER = 'call_center',
  SYSTEM = 'system'
}

export interface ICustomerActivity extends Document {
  customerRef: Types.ObjectId;
  customerId: string;
  activityType: ActivityType;
  channel: ActivityChannel;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
  createdAt: Date;
}

const CustomerActivitySchema = new Schema<ICustomerActivity>(
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
    activityType: {
      type: String,
      enum: Object.values(ActivityType),
      required: true,
      index: true
    },
    channel: {
      type: String,
      enum: Object.values(ActivityChannel),
      default: ActivityChannel.WEB
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    metadata: {
      type: Schema.Types.Mixed
    },
    occurredAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'customer_activities'
  }
);

// Compound index for querying recent activities per customer
CustomerActivitySchema.index({ customerRef: 1, occurredAt: -1 });

export const CustomerActivityModel: Model<ICustomerActivity> =
  mongoose.models.CustomerActivity ||
  mongoose.model<ICustomerActivity>('CustomerActivity', CustomerActivitySchema);

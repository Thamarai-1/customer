import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export enum ActivityType {
  LOGIN = 'LOGIN',
  PURCHASE = 'PURCHASE',
  PLAN_RENEWAL = 'PLAN_RENEWAL',
  SERVICE_USAGE = 'SERVICE_USAGE',
  SUPPORT_INTERACTION = 'SUPPORT_INTERACTION',
  APP_INTERACTION = 'APP_INTERACTION'
}

export interface ICustomerActivity extends Document {
  customerId: string;
  customerRef?: Types.ObjectId;
  activityType: ActivityType;
  activityDate: Date;
  source: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const CustomerActivitySchema = new Schema<ICustomerActivity>(
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
      index: true
    },
    activityType: {
      type: String,
      enum: Object.values(ActivityType),
      required: true,
      index: true
    },
    activityDate: {
      type: Date,
      default: Date.now,
      required: true,
      index: true
    },
    source: {
      type: String,
      default: 'WEB',
      trim: true
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'customer_activities'
  }
);

CustomerActivitySchema.index({ customerId: 1, activityDate: -1 });

export const ActivityModel: Model<ICustomerActivity> =
  mongoose.models.CustomerActivity ||
  mongoose.model<ICustomerActivity>('CustomerActivity', CustomerActivitySchema);

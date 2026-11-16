import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export enum BillingStatus {
  PAID = 'paid',
  PENDING = 'pending',
  OVERDUE = 'overdue',
  DISPUTED = 'disputed',
  CANCELLED = 'cancelled'
}

export enum ReminderStage {
  NONE = 'none',
  FIRST_COURTEOUS = 'first_courteous',
  SECOND_REMINDER = 'second_reminder',
  FINAL_OVERDUE = 'final_overdue'
}

export interface IBillingRecord extends Document {
  customerRef: Types.ObjectId;
  customerId: string;
  invoiceNumber: string;
  billingDate: Date;
  dueDate: Date;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: BillingStatus;
  daysOverdue: number;
  reminderStage: ReminderStage;
  paidAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BillingRecordSchema = new Schema<IBillingRecord>(
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
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    billingDate: {
      type: Date,
      required: true
    },
    dueDate: {
      type: Date,
      required: true,
      index: true
    },
    amountDue: {
      type: Number,
      required: true,
      min: 0
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true
    },
    status: {
      type: String,
      enum: Object.values(BillingStatus),
      default: BillingStatus.PENDING,
      index: true
    },
    daysOverdue: {
      type: Number,
      default: 0
    },
    reminderStage: {
      type: String,
      enum: Object.values(ReminderStage),
      default: ReminderStage.NONE,
      index: true
    },
    paidAt: {
      type: Date
    },
    notes: {
      type: String
    }
  },
  {
    timestamps: true,
    collection: 'billing_records'
  }
);

BillingRecordSchema.index({ customerRef: 1, status: 1 });
BillingRecordSchema.index({ status: 1, dueDate: 1 });

export const BillingRecordModel: Model<IBillingRecord> =
  mongoose.models.BillingRecord ||
  mongoose.model<IBillingRecord>('BillingRecord', BillingRecordSchema);

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERDUE = 'OVERDUE'
}

export enum InvoiceStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  CLOSED = 'CLOSED'
}

export interface IBillingRecord extends Document {
  customerId: string;
  customerRef?: Types.ObjectId;
  invoiceId: string;
  invoiceAmount: number;
  outstandingAmount: number;
  currency: string;
  invoiceDate: Date;
  dueDate: Date;
  paymentDate?: Date;
  paymentStatus: PaymentStatus;
  invoiceStatus: InvoiceStatus;
  disputeStatus: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BillingRecordSchema = new Schema<IBillingRecord>(
  {
    customerId: {
      type: String,
      required: true,
      index: true,
      trim: true,
      uppercase: true
    },
    customerRef: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      index: true
    },
    invoiceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    invoiceAmount: {
      type: Number,
      required: true,
      min: 0
    },
    outstandingAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      trim: true,
      uppercase: true
    },
    invoiceDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    dueDate: {
      type: Date,
      required: true,
      index: true
    },
    paymentDate: {
      type: Date
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      required: true,
      index: true
    },
    invoiceStatus: {
      type: String,
      enum: Object.values(InvoiceStatus),
      default: InvoiceStatus.ACTIVE,
      required: true,
      index: true
    },
    disputeStatus: {
      type: String,
      default: 'NONE',
      trim: true
    },
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    collection: 'billing_records'
  }
);

BillingRecordSchema.index({ customerId: 1, invoiceDate: -1 });
BillingRecordSchema.index({ paymentStatus: 1, dueDate: 1 });

export const BillingRecordModel: Model<IBillingRecord> =
  mongoose.models.BillingRecord ||
  mongoose.model<IBillingRecord>('BillingRecord', BillingRecordSchema);

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EDITED_AND_APPROVED = 'edited_and_approved'
}

export interface IApproval extends Document {
  generatedMessageRef: Types.ObjectId;
  customerRef: Types.ObjectId;
  reviewerRef?: Types.ObjectId;
  status: ApprovalStatus;
  originalSubject: string;
  originalBody: string;
  editedSubject?: string;
  editedBody?: string;
  reviewerNotes?: string;
  rejectionReasonCode?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApprovalSchema = new Schema<IApproval>(
  {
    generatedMessageRef: {
      type: Schema.Types.ObjectId,
      ref: 'GeneratedMessage',
      required: true,
      unique: true,
      index: true
    },
    customerRef: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true
    },
    reviewerRef: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    status: {
      type: String,
      enum: Object.values(ApprovalStatus),
      default: ApprovalStatus.PENDING,
      index: true
    },
    originalSubject: {
      type: String,
      required: true
    },
    originalBody: {
      type: String,
      required: true
    },
    editedSubject: {
      type: String
    },
    editedBody: {
      type: String
    },
    reviewerNotes: {
      type: String
    },
    rejectionReasonCode: {
      type: String
    },
    reviewedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    collection: 'approvals'
  }
);

ApprovalSchema.index({ status: 1, createdAt: 1 });

export const ApprovalModel: Model<IApproval> =
  mongoose.models.Approval || mongoose.model<IApproval>('Approval', ApprovalSchema);

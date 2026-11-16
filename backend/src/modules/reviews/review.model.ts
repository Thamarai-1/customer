import mongoose, { Schema, Model } from 'mongoose';
import {
  IMessageReview,
  IMessageReviewDocument,
  IMessageVersion,
  IMessageVersionDocument,
  IReviewAction,
  IReviewActionDocument
} from './review.types.js';
import {
  ReviewStatus,
  ReviewActionType,
  MessageVersionSource,
  RejectionReasonCode
} from './review.constants.js';

// ==========================================
// 1. Message Review Schema
// ==========================================
const MessageReviewSchema = new Schema<IMessageReview>(
  {
    generatedMessageId: {
      type: Schema.Types.ObjectId,
      ref: 'GeneratedMessage',
      required: true,
      unique: true,
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
    currentMessageVersion: {
      type: Number,
      default: 1,
      required: true
    },
    currentComplianceValidationId: {
      type: Schema.Types.ObjectId,
      ref: 'ComplianceValidation',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(ReviewStatus),
      default: ReviewStatus.PENDING_REVIEW,
      index: true
    },
    assignedReviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    assignedReviewerName: {
      type: String
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedByName: {
      type: String
    },
    reviewComments: {
      type: String
    },
    rejectionReason: {
      type: String
    },
    rejectionReasonCode: {
      type: String,
      enum: Object.values(RejectionReasonCode)
    },
    warningAcknowledgements: {
      type: [String],
      default: []
    },
    staleDataDetected: {
      type: Boolean,
      default: false
    },
    staleDataReason: {
      type: String
    },
    approvedAt: {
      type: Date
    },
    rejectedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    collection: 'message_reviews'
  }
);

MessageReviewSchema.index({ status: 1, createdAt: -1 });
MessageReviewSchema.index({ customerId: 1, createdAt: -1 });

// ==========================================
// 2. Message Version Schema
// ==========================================
const MessageVersionSchema = new Schema<IMessageVersion>(
  {
    generatedMessageId: {
      type: Schema.Types.ObjectId,
      ref: 'GeneratedMessage',
      required: true,
      index: true
    },
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: 'MessageReview',
      required: true,
      index: true
    },
    version: {
      type: Number,
      required: true
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
    source: {
      type: String,
      enum: Object.values(MessageVersionSource),
      required: true
    },
    editedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    editedByName: {
      type: String
    },
    editReason: {
      type: String
    },
    complianceValidationId: {
      type: Schema.Types.ObjectId,
      ref: 'ComplianceValidation',
      index: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true
    }
  },
  {
    timestamps: false,
    collection: 'message_versions'
  }
);

// Compound index guaranteeing uniqueness of versions per message
MessageVersionSchema.index({ generatedMessageId: 1, version: 1 }, { unique: true });

// ==========================================
// 3. Review Action Schema (Immutable Audit Trail)
// ==========================================
const ReviewActionSchema = new Schema<IReviewAction>(
  {
    reviewId: {
      type: Schema.Types.ObjectId,
      ref: 'MessageReview',
      required: true,
      index: true
    },
    generatedMessageId: {
      type: Schema.Types.ObjectId,
      ref: 'GeneratedMessage',
      required: true,
      index: true
    },
    messageVersion: {
      type: Number,
      required: true
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    reviewerName: {
      type: String,
      required: true
    },
    action: {
      type: String,
      enum: Object.values(ReviewActionType),
      required: true,
      index: true
    },
    comments: {
      type: String
    },
    previousStatus: {
      type: String
    },
    newStatus: {
      type: String
    },
    complianceValidationId: {
      type: Schema.Types.ObjectId,
      ref: 'ComplianceValidation'
    },
    warningAcknowledgements: {
      type: [String],
      default: []
    },
    metadata: {
      type: Schema.Types.Mixed
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true
    }
  },
  {
    timestamps: false,
    collection: 'review_actions'
  }
);

ReviewActionSchema.index({ reviewId: 1, createdAt: 1 });
ReviewActionSchema.index({ generatedMessageId: 1, createdAt: 1 });

export const MessageReviewModel: Model<IMessageReviewDocument> =
  (mongoose.models.MessageReview as Model<IMessageReviewDocument>) ||
  mongoose.model<IMessageReviewDocument>('MessageReview', MessageReviewSchema as any);

export const MessageVersionModel: Model<IMessageVersionDocument> =
  (mongoose.models.MessageVersion as Model<IMessageVersionDocument>) ||
  mongoose.model<IMessageVersionDocument>('MessageVersion', MessageVersionSchema as any);

export const ReviewActionModel: Model<IReviewActionDocument> =
  (mongoose.models.ReviewAction as Model<IReviewActionDocument>) ||
  mongoose.model<IReviewActionDocument>('ReviewAction', ReviewActionSchema as any);

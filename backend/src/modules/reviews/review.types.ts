import { Document, Types } from 'mongoose';
import {
  ReviewStatus,
  ReviewActionType,
  MessageVersionSource,
  RejectionReasonCode
} from './review.constants.js';
import { AIProviderType } from '../ai/ai-provider.types.js';

export interface IMessageReview {
  generatedMessageId: Types.ObjectId;
  customerId: string;
  customerRef: Types.ObjectId;
  currentMessageVersion: number;
  currentComplianceValidationId: Types.ObjectId;
  status: ReviewStatus;
  assignedReviewerId?: Types.ObjectId;
  assignedReviewerName?: string;
  reviewedBy?: Types.ObjectId;
  reviewedByName?: string;
  reviewComments?: string;
  rejectionReason?: string;
  rejectionReasonCode?: RejectionReasonCode;
  warningAcknowledgements: string[];
  staleDataDetected: boolean;
  staleDataReason?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessageReviewDocument extends IMessageReview, Document {}

export interface IMessageVersion {
  generatedMessageId: Types.ObjectId;
  reviewId: Types.ObjectId;
  version: number;
  subject: string;
  body: string;
  source: MessageVersionSource;
  editedBy?: Types.ObjectId;
  editedByName?: string;
  editReason?: string;
  complianceValidationId?: Types.ObjectId;
  createdAt: Date;
}

export interface IMessageVersionDocument extends IMessageVersion, Document {}

export interface IReviewAction {
  reviewId: Types.ObjectId;
  generatedMessageId: Types.ObjectId;
  messageVersion: number;
  reviewerId: Types.ObjectId;
  reviewerName: string;
  action: ReviewActionType;
  comments?: string;
  previousStatus?: string;
  newStatus?: string;
  complianceValidationId?: Types.ObjectId;
  warningAcknowledgements?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface IReviewActionDocument extends IReviewAction, Document {}

export interface EditMessageDTO {
  subject: string;
  body: string;
  editReason?: string;
}

export interface ApproveMessageDTO {
  messageVersion: number;
  complianceValidationId: string;
  warningAcknowledgements?: string[];
  comments?: string;
}

export interface RejectMessageDTO {
  rejectionReasonCode: RejectionReasonCode;
  rejectionReason: string;
  comments?: string;
}

export interface RequestRevisionDTO {
  comments: string;
}

export interface AssignReviewerDTO {
  reviewerId: string;
}

export interface RegenerateMessageDTO {
  reason?: string;
  provider?: AIProviderType;
  modelOverride?: string;
}

export interface ReviewDashboardStats {
  totalPendingReviews: number;
  currentlyUnderReview: number;
  approvedMessages: number;
  rejectedMessages: number;
  revisionRequested: number;
  messagesWithComplianceWarnings: number;
  messagesBlockedByCompliance: number;
  averageReviewTimeHours?: number;
}

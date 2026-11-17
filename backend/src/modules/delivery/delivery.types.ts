import { Types, Document } from 'mongoose';
import { DeliveryMode, DeliveryStatus, DeliveryErrorCode } from './delivery.constants.js';

export interface IDeliveryRecord {
  generatedMessageId: Types.ObjectId;
  customerId: string;
  customerRef: Types.ObjectId;
  messageVersion: number;
  reviewId: Types.ObjectId;
  approvalActionId: Types.ObjectId;
  complianceValidationId: Types.ObjectId;
  campaignRef?: Types.ObjectId;
  channel: string;
  deliveryMode: DeliveryMode;
  status: DeliveryStatus;
  idempotencyKey: string;
  providerMessageId?: string;
  recipientMasked: string;
  subject: string;
  bodySnippet: string;
  errorCode?: DeliveryErrorCode | string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type IDeliveryRecordDocument = IDeliveryRecord & Document;

export interface CreateDeliveryDTO {
  generatedMessageId: string;
  messageVersion: number;
  deliveryMode: DeliveryMode;
  idempotencyKey?: string;
  channel?: string;
}

export interface DeliveryFilterOptions {
  customerId?: string;
  campaignId?: string;
  status?: DeliveryStatus;
  channel?: string;
  deliveryMode?: DeliveryMode;
  startDate?: string;
  endDate?: string;
}

export interface DeliveryDashboardStats {
  totalAttempts: number;
  mockDeliveries: number;
  draftOnlyRecords: number;
  successfulMockDeliveries: number;
  failedAttempts: number;
  blockedAttempts: number;
  duplicateAttemptsPrevented: number;
  channelDistribution: Record<string, number>;
  deliverySuccessRate: number; // percentage (0-100)
}

export interface PreconditionCheckResult {
  passed: boolean;
  errorCode?: DeliveryErrorCode;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

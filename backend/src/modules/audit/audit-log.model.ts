import mongoose, { Schema, Document, Model } from 'mongoose';

export enum AuditActorType {
  USER = 'user',
  SYSTEM = 'system',
  AI_AGENT = 'ai_agent'
}

export enum AuditActionType {
  CUSTOMER_PROFILE_ASSEMBLED = 'CUSTOMER_PROFILE_ASSEMBLED',
  SEGMENT_CLASSIFIED = 'SEGMENT_CLASSIFIED',
  OFFER_RECOMMENDED = 'OFFER_RECOMMENDED',
  MESSAGE_DRAFTED = 'MESSAGE_DRAFTED',
  COMPLIANCE_EVALUATED = 'COMPLIANCE_EVALUATED',
  HUMAN_APPROVAL_SUBMITTED = 'HUMAN_APPROVAL_SUBMITTED',
  MESSAGE_DISPATCHED = 'MESSAGE_DISPATCHED',
  POLICY_VIOLATION_BLOCKED = 'POLICY_VIOLATION_BLOCKED'
}

export interface IAuditLog extends Document {
  actorType: AuditActorType;
  actorId: string;
  action: AuditActionType;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorType: {
      type: String,
      enum: Object.values(AuditActorType),
      required: true,
      index: true
    },
    actorId: {
      type: String,
      required: true,
      index: true
    },
    action: {
      type: String,
      enum: Object.values(AuditActionType),
      required: true,
      index: true
    },
    entityType: {
      type: String,
      required: true,
      index: true
    },
    entityId: {
      type: String,
      required: true,
      index: true
    },
    metadata: {
      type: Schema.Types.Mixed
    },
    ipAddress: {
      type: String
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false,
    collection: 'audit_logs'
  }
);

AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ timestamp: -1 });

export const AuditLogModel: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

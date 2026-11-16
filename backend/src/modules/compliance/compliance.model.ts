import mongoose, { Schema } from 'mongoose';
import {
  IComplianceValidation,
  IComplianceValidationDocument,
  IValidationCheckResult,
  IValidationFinding
} from './compliance.types.js';
import {
  CheckId,
  CheckStatus,
  SeverityLevel,
  RecommendedAction,
  OverallComplianceDecision,
  ComplianceReasonCode
} from './compliance.constants.js';

const FindingSchema = new Schema<IValidationFinding>(
  {
    ruleId: { type: String, required: true },
    checkId: { type: String, enum: Object.values(CheckId), required: true },
    severity: { type: String, enum: Object.values(SeverityLevel), required: true },
    reasonCode: { type: String, enum: Object.values(ComplianceReasonCode), required: true },
    message: { type: String, required: true },
    evidenceValue: { type: String },
    generatedValue: { type: String },
    recommendedAction: { type: String, enum: Object.values(RecommendedAction), required: true }
  },
  { _id: false }
);

const CheckResultSchema = new Schema<IValidationCheckResult>(
  {
    checkId: { type: String, enum: Object.values(CheckId), required: true },
    checkName: { type: String, required: true },
    status: { type: String, enum: Object.values(CheckStatus), required: true },
    severity: { type: String, enum: Object.values(SeverityLevel), required: true },
    reasonCode: { type: String, enum: Object.values(ComplianceReasonCode) },
    message: { type: String, required: true },
    findings: { type: [FindingSchema], default: [] },
    evidence: { type: Schema.Types.Mixed },
    recommendedAction: { type: String, enum: Object.values(RecommendedAction), required: true },
    durationMs: { type: Number, default: 0 }
  },
  { _id: false }
);

const ComplianceValidationSchema = new Schema<IComplianceValidation>(
  {
    messageId: {
      type: Schema.Types.ObjectId,
      ref: 'GeneratedMessage',
      required: true,
      index: true
    },
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
      required: true,
      index: true
    },
    policyEvaluationId: {
      type: Schema.Types.ObjectId,
      ref: 'PolicyEvaluation',
      index: true
    },
    overallStatus: {
      type: String,
      enum: Object.values(OverallComplianceDecision),
      required: true,
      index: true
    },
    decision: {
      type: String,
      enum: Object.values(RecommendedAction),
      required: true
    },
    summary: {
      totalChecks: { type: Number, required: true },
      passed: { type: Number, required: true },
      failed: { type: Number, required: true },
      warnings: { type: Number, required: true },
      skipped: { type: Number, required: true },
      insufficientData: { type: Number, required: true }
    },
    checks: {
      type: [CheckResultSchema],
      required: true,
      default: []
    },
    findings: {
      type: [FindingSchema],
      required: true,
      default: []
    },
    policyVersion: {
      type: String,
      required: true,
      default: '1.0.0'
    },
    validatorVersions: {
      type: Schema.Types.Mixed,
      default: {}
    },
    validatedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'compliance_validations'
  }
);

ComplianceValidationSchema.index({ messageId: 1, validatedAt: -1 });
ComplianceValidationSchema.index({ customerId: 1, validatedAt: -1 });
ComplianceValidationSchema.index({ overallStatus: 1, validatedAt: -1 });

export const ComplianceValidationModel = mongoose.model<
  IComplianceValidation,
  mongoose.Model<IComplianceValidation, {}, {}, {}, IComplianceValidationDocument>
>('ComplianceValidation', ComplianceValidationSchema);

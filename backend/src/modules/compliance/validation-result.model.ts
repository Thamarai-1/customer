import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export enum ValidationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL_BLOCK = 'critical_block'
}

export interface IValidationCheckItem {
  ruleCode: string;
  name: string;
  category: 'grounding' | 'consent' | 'tone' | 'pii' | 'blocked_words' | 'frequency';
  passed: boolean;
  severity: ValidationSeverity;
  findings?: string;
}

export interface IValidationResult extends Document {
  generatedMessageRef: Types.ObjectId;
  customerRef: Types.ObjectId;
  passedAllChecks: boolean;
  safetyScore: number;
  checks: IValidationCheckItem[];
  criticalViolationsCount: number;
  inventedFactsDetected: boolean;
  prohibitedLanguageDetected: boolean;
  consentVerified: boolean;
  evaluatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ValidationCheckItemSchema = new Schema<IValidationCheckItem>(
  {
    ruleCode: { type: String, required: true },
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ['grounding', 'consent', 'tone', 'pii', 'blocked_words', 'frequency'],
      required: true
    },
    passed: { type: Boolean, required: true },
    severity: {
      type: String,
      enum: Object.values(ValidationSeverity),
      required: true
    },
    findings: { type: String }
  },
  { _id: false }
);

const ValidationResultSchema = new Schema<IValidationResult>(
  {
    generatedMessageRef: {
      type: Schema.Types.ObjectId,
      ref: 'GeneratedMessage',
      required: true,
      index: true
    },
    customerRef: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true
    },
    passedAllChecks: {
      type: Boolean,
      required: true,
      index: true
    },
    safetyScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    },
    checks: {
      type: [ValidationCheckItemSchema],
      default: []
    },
    criticalViolationsCount: {
      type: Number,
      default: 0
    },
    inventedFactsDetected: {
      type: Boolean,
      default: false
    },
    prohibitedLanguageDetected: {
      type: Boolean,
      default: false
    },
    consentVerified: {
      type: Boolean,
      default: true
    },
    evaluatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    collection: 'validation_results'
  }
);

export const ValidationResultModel: Model<IValidationResult> =
  mongoose.models.ValidationResult ||
  mongoose.model<IValidationResult>('ValidationResult', ValidationResultSchema);

import mongoose, { Document, Schema } from 'mongoose';
import { IPolicyEvaluationReport } from './policy-engine.types.js';

export interface IPolicyEvaluationDocument extends Omit<IPolicyEvaluationReport, 'evaluationId'>, Document {}

const PolicyEvaluationSchema = new Schema<IPolicyEvaluationDocument>(
  {
    customerId: {
      type: String,
      required: true,
      index: true,
      trim: true,
      uppercase: true
    },
    evaluatedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    customerSummary: {
      type: Schema.Types.Mixed,
      required: true
    },
    strategy: {
      type: Schema.Types.Mixed,
      required: true
    },
    campaigns: {
      type: Schema.Types.Mixed,
      required: true
    },
    offers: {
      type: Schema.Types.Mixed,
      required: true
    },
    billing: {
      type: Schema.Types.Mixed,
      required: true
    },
    channelConsent: {
      type: Schema.Types.Mixed,
      required: true
    },
    recommendation: {
      type: Schema.Types.Mixed,
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'policy_evaluations'
  }
);

PolicyEvaluationSchema.index({ customerId: 1, evaluatedAt: -1 });

export const PolicyEvaluationModel = mongoose.model<IPolicyEvaluationDocument>(
  'PolicyEvaluation',
  PolicyEvaluationSchema
);

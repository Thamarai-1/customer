import mongoose, { Schema } from 'mongoose';
import { ICompliancePolicyConfig, ICompliancePolicyConfigDocument } from './compliance.types.js';
import { DEFAULT_BLOCKED_PHRASES } from './rules/blocked-phrases.js';
import { DEFAULT_REQUIRED_DISCLAIMERS } from './rules/required-disclaimers.js';

const CompliancePolicyConfigSchema = new Schema<ICompliancePolicyConfig>(
  {
    version: {
      type: String,
      required: true,
      default: '1.0.0',
      unique: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    frequencyLimits: {
      maxDailyMarketingEmails: { type: Number, default: 2 },
      maxWeeklyMarketingEmails: { type: Number, default: 5 },
      minIntervalHoursMarketing: { type: Number, default: 12 },
      maxBillingRemindersPerMonth: { type: Number, default: 4 }
    },
    blockedPhrases: {
      type: [String],
      default: DEFAULT_BLOCKED_PHRASES
    },
    requiredDisclaimers: {
      offerTermsText: { type: String, default: DEFAULT_REQUIRED_DISCLAIMERS.offerTermsText },
      billingDisputeText: { type: String, default: DEFAULT_REQUIRED_DISCLAIMERS.billingDisputeText },
      supportContactText: { type: String, default: DEFAULT_REQUIRED_DISCLAIMERS.supportContactText }
    },
    duplicateWindowHours: {
      type: Number,
      default: 72
    },
    updatedBy: {
      type: String,
      default: 'SYSTEM'
    }
  },
  {
    timestamps: true,
    collection: 'compliance_policy_configs'
  }
);

export const CompliancePolicyConfigModel = mongoose.model<
  ICompliancePolicyConfig,
  mongoose.Model<ICompliancePolicyConfig, {}, {}, {}, ICompliancePolicyConfigDocument>
>('CompliancePolicyConfig', CompliancePolicyConfigSchema);

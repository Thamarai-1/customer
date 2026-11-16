import mongoose, { Document, Schema } from 'mongoose';
import { IBillingPolicyConfig } from './billing-policies.types.js';
import { DEFAULT_BILLING_POLICY_CONFIG } from './billing-policies.constants.js';

export interface IBillingPolicyConfigDocument extends IBillingPolicyConfig, Document {}

const BillingPolicyConfigSchema = new Schema<IBillingPolicyConfigDocument>(
  {
    upcomingDaysThreshold: {
      type: Number,
      default: DEFAULT_BILLING_POLICY_CONFIG.upcomingDaysThreshold
    },
    reminder1DaysThreshold: {
      type: Number,
      default: DEFAULT_BILLING_POLICY_CONFIG.reminder1DaysThreshold
    },
    reminder2DaysThreshold: {
      type: Number,
      default: DEFAULT_BILLING_POLICY_CONFIG.reminder2DaysThreshold
    },
    reminder3DaysThreshold: {
      type: Number,
      default: DEFAULT_BILLING_POLICY_CONFIG.reminder3DaysThreshold
    },
    escalationDaysThreshold: {
      type: Number,
      default: DEFAULT_BILLING_POLICY_CONFIG.escalationDaysThreshold
    },
    requireHumanReviewForEscalation: {
      type: Boolean,
      default: DEFAULT_BILLING_POLICY_CONFIG.requireHumanReviewForEscalation
    },
    excludeDisputedInvoices: {
      type: Boolean,
      default: DEFAULT_BILLING_POLICY_CONFIG.excludeDisputedInvoices
    },
    minOutstandingAmountToRemind: {
      type: Number,
      default: DEFAULT_BILLING_POLICY_CONFIG.minOutstandingAmountToRemind
    }
  },
  {
    timestamps: true,
    collection: 'billing_policy_configs'
  }
);

export const BillingPolicyConfigModel = mongoose.model<IBillingPolicyConfigDocument>(
  'BillingPolicyConfig',
  BillingPolicyConfigSchema
);

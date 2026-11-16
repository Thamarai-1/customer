import { Types, HydratedDocument } from 'mongoose';
import {
  CheckId,
  CheckStatus,
  SeverityLevel,
  RecommendedAction,
  OverallComplianceDecision,
  ComplianceReasonCode
} from './compliance.constants.js';
import { IGeneratedMessageDocument } from '../message-generation/message-generation.types.js';
import { ICustomer } from '../customers/customer.model.js';
import { AssembledCustomerProfile } from '../customers/customer-profile.service.js';
import { IPolicyEvaluationReport } from '../policy-engine/policy-engine.types.js';
import { ICommunicationHistory } from '../delivery/communication-history.model.js';
import { IBillingRecord } from '../billing/billing-record.model.js';
import { IOfferDocument } from '../offers/offers.model.js';

export interface IValidationFinding {
  ruleId: string;
  checkId: CheckId;
  severity: SeverityLevel;
  reasonCode: ComplianceReasonCode;
  message: string;
  evidenceValue?: string;
  generatedValue?: string;
  recommendedAction: RecommendedAction;
}

export interface IValidationCheckResult {
  checkId: CheckId;
  checkName: string;
  status: CheckStatus;
  severity: SeverityLevel;
  reasonCode?: ComplianceReasonCode;
  message: string;
  findings: IValidationFinding[];
  evidence?: Record<string, unknown>;
  recommendedAction: RecommendedAction;
  durationMs?: number;
}

export interface IComplianceSummary {
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  skipped: number;
  insufficientData: number;
}

export interface IComplianceValidation {
  messageId: Types.ObjectId;
  customerId: string;
  customerRef: Types.ObjectId;
  policyEvaluationId?: Types.ObjectId;
  overallStatus: OverallComplianceDecision;
  decision: RecommendedAction;
  summary: IComplianceSummary;
  checks: IValidationCheckResult[];
  findings: IValidationFinding[];
  policyVersion: string;
  validatorVersions: Record<string, string>;
  validatedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IComplianceValidationDocument = HydratedDocument<IComplianceValidation>;

export interface ICompliancePolicyConfig {
  version: string;
  isActive: boolean;
  frequencyLimits: {
    maxDailyMarketingEmails: number;
    maxWeeklyMarketingEmails: number;
    minIntervalHoursMarketing: number;
    maxBillingRemindersPerMonth: number;
  };
  blockedPhrases: string[];
  requiredDisclaimers: {
    offerTermsText: string;
    billingDisputeText: string;
    supportContactText: string;
  };
  duplicateWindowHours: number;
  updatedBy?: string;
  updatedAt?: Date;
}

export type ICompliancePolicyConfigDocument = HydratedDocument<ICompliancePolicyConfig>;

export interface ComplianceValidationContext {
  message: IGeneratedMessageDocument;
  customer: ICustomer;
  profile: AssembledCustomerProfile;
  policyReport?: IPolicyEvaluationReport;
  communicationHistory: ICommunicationHistory[];
  latestBillingRecords: IBillingRecord[];
  latestOffers: IOfferDocument[];
  config: ICompliancePolicyConfig;
}

import { Types } from 'mongoose';
import { ComplianceValidationModel } from './compliance.model.js';
import { CompliancePolicyConfigModel } from './compliance.policy-config.model.js';
import {
  IComplianceValidationDocument,
  ICompliancePolicyConfig,
  ComplianceValidationContext,
  IValidationCheckResult
} from './compliance.types.js';
import {
  OverallComplianceDecision,
  COMPLIANCE_VALIDATOR_VERSION
} from './compliance.constants.js';
import { SeverityMapper } from './rules/severity-mapping.js';
import { GeneratedMessageModel } from '../message-generation/message-generation.model.js';
import { CustomerRepository } from '../customers/customer.repository.js';
import { CustomerProfileService } from '../customers/customer-profile.service.js';
import { PolicyEngineService } from '../policy-engine/policy-engine.service.js';
import { CommunicationHistoryModel } from '../delivery/communication-history.model.js';
import { BillingRecordModel } from '../billing/billing-record.model.js';
import { OfferModel } from '../offers/offers.model.js';
import { PaginationQueryOptions, getPaginationMeta } from '../../utils/pagination.js';
import { PaginationMeta } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

// Import all 11 Validators
import { GroundingValidator } from './validators/grounding.validator.js';
import { OfferValidator } from './validators/offer.validator.js';
import { BillingValidator } from './validators/billing.validator.js';
import { ConsentValidator } from './validators/consent.validator.js';
import { FrequencyValidator } from './validators/frequency.validator.js';
import { DuplicateValidator } from './validators/duplicate.validator.js';
import { LanguageValidator } from './validators/language.validator.js';
import { PrivacyValidator } from './validators/privacy.validator.js';
import { ChannelValidator } from './validators/channel.validator.js';
import { DisclaimerValidator } from './validators/disclaimer.validator.js';
import { ContentPolicyValidator } from './validators/content-policy.validator.js';

export class ComplianceService {
  /**
   * Retrieves or initializes the active Compliance Policy Configuration.
   */
  static async getActiveConfig(): Promise<ICompliancePolicyConfig> {
    let config = await CompliancePolicyConfigModel.findOne({ isActive: true }).sort({ createdAt: -1 });
    if (!config) {
      config = await CompliancePolicyConfigModel.create({
        version: '1.0.0',
        isActive: true,
        updatedBy: 'SYSTEM_INITIALIZATION'
      });
      logger.info('Initialized default compliance policy configuration', 'ComplianceService');
    }
    return config.toObject() as unknown as ICompliancePolicyConfig;
  }

  /**
   * Executes the full independent 11-step compliance validation pipeline for a generated message draft.
   */
  static async validateMessage(messageId: string): Promise<IComplianceValidationDocument> {
    if (!Types.ObjectId.isValid(messageId)) {
      throw new Error('INVALID_MESSAGE_ID');
    }

    const message = await GeneratedMessageModel.findById(messageId);
    if (!message) {
      throw new Error('MESSAGE_NOT_FOUND');
    }

    const customer = await CustomerRepository.findByIdOrCustomerId(message.customerId);
    if (!customer) {
      throw new Error(`CUSTOMER_NOT_FOUND: Customer ${message.customerId} not found`);
    }

    logger.info(`Starting compliance validation for message ${messageId} (Customer: ${customer.customerId})`, 'ComplianceService');

    // 1. Gather all independent verified facts concurrently
    const [profile, policyReport, communicationHistory, latestBillingRecords, latestOffers, config] =
      await Promise.all([
        CustomerProfileService.assembleProfile(customer.customerId).catch(() => null),
        PolicyEngineService.evaluateCustomerPolicy(customer.customerId, { channel: message.channel }).catch(() => null),
        CommunicationHistoryModel.find({ customerRef: customer._id }).sort({ sentAt: -1 }).limit(50),
        BillingRecordModel.find({ customerId: customer.customerId }).sort({ invoiceDate: -1 }),
        OfferModel.find({ status: 'ACTIVE' }),
        this.getActiveConfig()
      ]);

    if (!profile) {
      throw new Error('INSUFFICIENT_CUSTOMER_EVIDENCE');
    }

    const context: ComplianceValidationContext = {
      message,
      customer,
      profile,
      policyReport: policyReport || undefined,
      communicationHistory,
      latestBillingRecords,
      latestOffers,
      config
    };

    // 2. Execute all 11 independent validators
    const checks: IValidationCheckResult[] = await Promise.all([
      GroundingValidator.execute(context),
      OfferValidator.execute(context),
      BillingValidator.execute(context),
      ConsentValidator.execute(context),
      FrequencyValidator.execute(context),
      DuplicateValidator.execute(context),
      LanguageValidator.execute(context),
      PrivacyValidator.execute(context),
      ChannelValidator.execute(context),
      DisclaimerValidator.execute(context),
      ContentPolicyValidator.execute(context)
    ]);

    // 3. Aggregate all individual check findings
    const allFindings = checks.flatMap((c) => c.findings);

    // 4. Deterministic decision aggregation
    const { overallStatus, decision, summary } = SeverityMapper.aggregateDecision(checks);

    // 5. Persist independent immutable validation run
    const validationDoc = await ComplianceValidationModel.create({
      messageId: message._id,
      customerId: customer.customerId,
      customerRef: customer._id,
      policyEvaluationId: policyReport?.evaluationId ? new Types.ObjectId(policyReport.evaluationId) : undefined,
      overallStatus,
      decision,
      summary,
      checks,
      findings: allFindings,
      policyVersion: config.version,
      validatorVersions: {
        engine: COMPLIANCE_VALIDATOR_VERSION,
        grounding: '1.0.0',
        offer: '1.0.0',
        billing: '1.0.0',
        consent: '1.0.0',
        frequency: '1.0.0',
        duplicate: '1.0.0',
        language: '1.0.0',
        privacy: '1.0.0',
        channel: '1.0.0',
        disclaimer: '1.0.0',
        contentPolicy: '1.0.0'
      },
      validatedAt: new Date()
    });

    logger.info(
      `Compliance validation completed for message ${messageId}: ${overallStatus} (${decision}) - ${summary.passed}/${summary.totalChecks} passed`,
      'ComplianceService'
    );

    return validationDoc;
  }

  /**
   * Retrieves the most recent compliance report for a specific message.
   */
  static async getLatestReport(messageId: string): Promise<IComplianceValidationDocument | null> {
    if (!Types.ObjectId.isValid(messageId)) {
      throw new Error('INVALID_MESSAGE_ID');
    }
    return ComplianceValidationModel.findOne({ messageId: new Types.ObjectId(messageId) }).sort({ validatedAt: -1 });
  }

  /**
   * Retrieves complete validation history for a specific message with pagination.
   */
  static async getValidationHistory(
    messageId: string,
    pagination: PaginationQueryOptions
  ): Promise<{ reports: IComplianceValidationDocument[]; meta: PaginationMeta }> {
    if (!Types.ObjectId.isValid(messageId)) {
      throw new Error('INVALID_MESSAGE_ID');
    }

    const query = { messageId: new Types.ObjectId(messageId) };
    const [reports, total] = await Promise.all([
      ComplianceValidationModel.find(query)
        .sort({ [pagination.sortBy]: pagination.sortOrder })
        .skip(pagination.skip)
        .limit(pagination.limit),
      ComplianceValidationModel.countDocuments(query)
    ]);

    const meta = getPaginationMeta(total, pagination.page, pagination.limit);
    return { reports, meta };
  }

  /**
   * Retrieves a single validation report by its report ID.
   */
  static async getReportById(reportId: string): Promise<IComplianceValidationDocument> {
    if (!Types.ObjectId.isValid(reportId)) {
      throw new Error('INVALID_REPORT_ID');
    }
    const report = await ComplianceValidationModel.findById(reportId);
    if (!report) {
      throw new Error('COMPLIANCE_REPORT_NOT_FOUND');
    }
    return report;
  }

  /**
   * Validates all generated drafts for a customer in a controlled, paginated batch.
   */
  static async validateCustomerDrafts(
    customerId: string,
    pagination: PaginationQueryOptions
  ): Promise<{
    results: IComplianceValidationDocument[];
    meta: PaginationMeta;
  }> {
    const customer = await CustomerRepository.findByIdOrCustomerId(customerId);
    if (!customer) {
      throw new Error('CUSTOMER_NOT_FOUND');
    }

    const query = { customerId: customer.customerId };
    const [drafts, total] = await Promise.all([
      GeneratedMessageModel.find(query)
        .sort({ generatedAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      GeneratedMessageModel.countDocuments(query)
    ]);

    const results: IComplianceValidationDocument[] = [];
    for (const draft of drafts) {
      try {
        const report = await this.validateMessage(draft._id.toString());
        results.push(report);
      } catch (err: unknown) {
        logger.error(`Batch validation failed for draft ${draft._id}: ${err}`, 'ComplianceService');
      }
    }

    const meta = getPaginationMeta(total, pagination.page, pagination.limit);
    return { results, meta };
  }

  /**
   * Updates or versions the compliance policy configuration.
   */
  static async updateConfig(
    updates: Partial<ICompliancePolicyConfig>,
    updatedBy = 'ADMIN'
  ): Promise<ICompliancePolicyConfig> {
    const current = await this.getActiveConfig();
    const currentData = { ...current };
    delete (currentData as any)._id;
    delete (currentData as any).id;
    delete (currentData as any).createdAt;

    // Create a new version record
    const newVersion = updates.version || `1.0.${Date.now().toString().slice(-4)}`;

    // Deactivate previous
    await CompliancePolicyConfigModel.updateMany({ isActive: true }, { isActive: false });

    const newDoc = await CompliancePolicyConfigModel.create({
      ...currentData,
      ...updates,
      version: newVersion,
      isActive: true,
      updatedBy,
      updatedAt: new Date()
    });

    logger.info(`Updated compliance policy configuration to version ${newVersion} by ${updatedBy}`, 'ComplianceService');
    return newDoc.toObject() as unknown as ICompliancePolicyConfig;
  }

  /**
   * Aggregates platform compliance dashboard statistics.
   */
  static async getStatistics(): Promise<{
    totalValidations: number;
    passed: number;
    passedWithWarnings: number;
    revisionRequired: number;
    blocked: number;
    insufficientData: number;
    successRate: number;
    mostCommonFailures: Array<{ reasonCode: string; count: number }>;
  }> {
    const [totalValidations, statusCounts, failureAgg] = await Promise.all([
      ComplianceValidationModel.countDocuments(),
      ComplianceValidationModel.aggregate([
        {
          $group: {
            _id: '$overallStatus',
            count: { $sum: 1 }
          }
        }
      ]),
      ComplianceValidationModel.aggregate([
        { $unwind: '$findings' },
        {
          $group: {
            _id: '$findings.reasonCode',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 8 }
      ])
    ]);

    const counts: Record<string, number> = {};
    for (const item of statusCounts) {
      counts[item._id] = item.count;
    }

    const passed = counts[OverallComplianceDecision.PASS] || 0;
    const passedWithWarnings = counts[OverallComplianceDecision.PASS_WITH_WARNINGS] || 0;
    const revisionRequired = counts[OverallComplianceDecision.REVISION_REQUIRED] || 0;
    const blocked = counts[OverallComplianceDecision.BLOCKED] || 0;
    const insufficientData = counts[OverallComplianceDecision.INSUFFICIENT_DATA] || 0;

    const successful = passed + passedWithWarnings;
    const successRate = totalValidations > 0 ? Math.round((successful / totalValidations) * 100) : 100;

    const mostCommonFailures = failureAgg.map((item) => ({
      reasonCode: item._id,
      count: item.count
    }));

    return {
      totalValidations,
      passed,
      passedWithWarnings,
      revisionRequired,
      blocked,
      insufficientData,
      successRate,
      mostCommonFailures
    };
  }

  /**
   * Retrieves blocked messages with pagination and filtering.
   */
  static async getBlockedMessages(
    pagination: PaginationQueryOptions,
    filters: { customerId?: string; reasonCode?: string } = {}
  ): Promise<{
    reports: IComplianceValidationDocument[];
    meta: PaginationMeta;
  }> {
    const query: Record<string, unknown> = {
      overallStatus: OverallComplianceDecision.BLOCKED
    };

    if (filters.customerId) {
      query.customerId = filters.customerId.trim().toUpperCase();
    }

    if (filters.reasonCode) {
      query['findings.reasonCode'] = filters.reasonCode;
    }

    const [reports, total] = await Promise.all([
      ComplianceValidationModel.find(query)
        .sort({ [pagination.sortBy]: pagination.sortOrder })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .populate('messageId', 'subject body channel generatedAt primarySegment objective')
        .populate('customerRef', 'firstName lastName email customerId loyaltyInfo'),
      ComplianceValidationModel.countDocuments(query)
    ]);

    const meta = getPaginationMeta(total, pagination.page, pagination.limit);
    return { reports, meta };
  }
}

import { CustomerRepository } from '../customers/customer.repository.js';
import { CustomerProfileService } from '../customers/customer-profile.service.js';
import { BillingRecordModel, IBillingRecord } from '../billing/billing-record.model.js';
import { ActivityModel } from '../activities/activity.model.js';
import { CustomerModel } from '../customers/customer.model.js';
import {
  CustomerClassificationModel,
  CustomerClassificationHistoryModel,
  SegmentationConfigModel
} from './segmentation.model.js';
import {
  CustomerSegmentType,
  ClassificationStatus,
  SEGMENT_DEFINITIONS
} from './segmentation.constants.js';
import {
  ISegmentationConfig,
  ISegmentationResult,
  ISegmentationStatistics,
  ClassifyAllSummary,
  SegmentationQueryFilters
} from './segmentation.types.js';
import { DEFAULT_SEGMENTATION_CONFIG } from './segmentation.rules.js';
import { SegmentationEvaluator } from './segmentation.evaluator.js';
import { PaginationQueryOptions, getPaginationMeta } from '../../utils/pagination.js';
import { PaginationMeta } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

export class SegmentationService {
  /**
   * Retrieves the active segmentation configuration, or initializes default if none exists.
   */
  static async getActiveConfig(): Promise<ISegmentationConfig> {
    const configDoc = await SegmentationConfigModel.findOne({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    if (configDoc) {
      return configDoc as unknown as ISegmentationConfig;
    }

    // Bootstrap default config if database doesn't have one yet
    const created = await SegmentationConfigModel.create({
      ...DEFAULT_SEGMENTATION_CONFIG,
      isActive: true,
      updatedBy: 'SYSTEM'
    });

    return created.toObject() as unknown as ISegmentationConfig;
  }

  /**
   * Updates segmentation configuration thresholds and records rule versioning.
   */
  static async updateConfig(
    updates: Partial<ISegmentationConfig>,
    updatedBy: string
  ): Promise<ISegmentationConfig> {
    // 1. Fetch current active configuration first
    const currentConfig = await this.getActiveConfig();

    // 2. Deactivate previous active configurations
    await SegmentationConfigModel.updateMany({ isActive: true }, { isActive: false });

    const cleanConfig = { ...currentConfig } as Record<string, unknown>;
    delete cleanConfig._id;
    delete cleanConfig.__v;
    delete cleanConfig.createdAt;
    delete cleanConfig.updatedAt;

    const newConfigData = {
      ...DEFAULT_SEGMENTATION_CONFIG,
      ...cleanConfig,
      ...updates,
      isActive: true,
      updatedBy,
      updatedAt: new Date()
    };

    const newConfigDoc = await SegmentationConfigModel.create(newConfigData);
    logger.info(
      `Segmentation configuration updated to version ${newConfigDoc.ruleVersion} by ${updatedBy}`,
      'SegmentationService'
    );

    return newConfigDoc.toObject() as unknown as ISegmentationConfig;
  }

  /**
   * Classifies a single customer using verified profile, activity, and billing evidence.
   * Persists latest snapshot and creates history entry.
   */
  static async classifyCustomer(
    customerIdOrId: string,
    evaluationDate: Date = new Date()
  ): Promise<ISegmentationResult> {
    const customer = await CustomerRepository.findByIdOrCustomerId(customerIdOrId);
    if (!customer) {
      throw new Error('CUSTOMER_NOT_FOUND');
    }

    // 1. Fetch assembled profile and granular supporting evidence in parallel
    const [profile, invoices, lifetimeActivitiesCount, config] = await Promise.all([
      CustomerProfileService.assembleProfile(customer.customerId),
      BillingRecordModel.find({
        $or: [{ customerId: customer.customerId }, { customerRef: customer._id }]
      }).lean(),
      ActivityModel.countDocuments({
        $or: [{ customerId: customer.customerId }, { customerRef: customer._id }]
      }),
      this.getActiveConfig()
    ]);

    // 2. Execute deterministic evaluation
    const result = SegmentationEvaluator.evaluate(
      profile,
      invoices as unknown as IBillingRecord[],
      lifetimeActivitiesCount,
      config,
      evaluationDate
    );

    // 3. Check for existing classification to preserve history
    const existing = await CustomerClassificationModel.findOne({
      customerId: customer.customerId
    });

    if (existing) {
      // Archive previous classification to history
      await CustomerClassificationHistoryModel.create({
        customerId: existing.customerId,
        customerRef: existing.customerRef,
        primarySegment: existing.primarySegment,
        segments: existing.segments,
        classificationStatus: existing.classificationStatus,
        confidence: existing.confidence,
        reasonCodes: existing.reasonCodes,
        explanations: existing.explanations,
        evidence: existing.evidence,
        ruleVersion: existing.ruleVersion,
        classifiedAt: existing.classifiedAt
      });
    }

    // 4. Upsert latest classification
    await CustomerClassificationModel.findOneAndUpdate(
      { customerId: customer.customerId },
      {
        customerId: customer.customerId,
        customerRef: customer._id,
        primarySegment: result.primarySegment,
        segments: result.segments,
        classificationStatus: result.classificationStatus,
        confidence: result.confidence,
        reasonCodes: result.reasonCodes,
        explanations: result.explanations,
        evidence: result.evidence,
        ruleVersion: result.ruleVersion,
        classifiedAt: result.classifiedAt
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Also record the new classification in history
    await CustomerClassificationHistoryModel.create({
      customerId: customer.customerId,
      customerRef: customer._id,
      primarySegment: result.primarySegment,
      segments: result.segments,
      classificationStatus: result.classificationStatus,
      confidence: result.confidence,
      reasonCodes: result.reasonCodes,
      explanations: result.explanations,
      evidence: result.evidence,
      ruleVersion: result.ruleVersion,
      classifiedAt: result.classifiedAt
    });

    return result;
  }

  /**
   * Retrieves the current classification for a customer.
   * If never classified before, triggers on-demand classification.
   */
  static async getCustomerClassification(
    customerIdOrId: string
  ): Promise<ISegmentationResult> {
    const customer = await CustomerRepository.findByIdOrCustomerId(customerIdOrId);
    if (!customer) {
      throw new Error('CUSTOMER_NOT_FOUND');
    }

    const classification = await CustomerClassificationModel.findOne({
      customerId: customer.customerId
    }).lean();

    if (classification) {
      return {
        customerId: classification.customerId,
        customerRef: classification.customerRef.toString(),
        primarySegment: classification.primarySegment,
        segments: classification.segments,
        classificationStatus: classification.classificationStatus,
        confidence: classification.confidence,
        reasonCodes: classification.reasonCodes,
        explanations: classification.explanations,
        evidence: classification.evidence,
        ruleVersion: classification.ruleVersion,
        classifiedAt: classification.classifiedAt
      };
    }

    // If not yet classified, execute classification and return
    return this.classifyCustomer(customer.customerId);
  }

  /**
   * Retrieves classification history audit log for a customer.
   */
  static async getCustomerClassificationHistory(
    customerIdOrId: string,
    limit = 20
  ): Promise<Array<Record<string, unknown>>> {
    const customer = await CustomerRepository.findByIdOrCustomerId(customerIdOrId);
    if (!customer) {
      throw new Error('CUSTOMER_NOT_FOUND');
    }

    const history = await CustomerClassificationHistoryModel.find({
      customerId: customer.customerId
    })
      .sort({ classifiedAt: -1 })
      .limit(limit)
      .lean();

    return history as unknown as Array<Record<string, unknown>>;
  }

  /**
   * Classifies all non-archived customers in batches without loading entire database into memory.
   */
  static async classifyAll(batchSize = 100): Promise<ClassifyAllSummary> {
    const startTime = Date.now();
    logger.info('Starting batch classification for all customers...', 'SegmentationService');

    const totalCustomers = await CustomerModel.countDocuments({
      accountStatus: { $ne: 'ARCHIVED' }
    });

    let processedCount = 0;
    let classifiedCount = 0;
    let insufficientDataCount = 0;
    let failedCount = 0;
    let multiSegmentCount = 0;
    const errors: Array<{ customerId: string; error: string }> = [];

    let skip = 0;
    while (skip < totalCustomers) {
      const customersBatch = await CustomerModel.find({
        accountStatus: { $ne: 'ARCHIVED' }
      })
        .select('customerId _id')
        .skip(skip)
        .limit(batchSize)
        .lean();

      if (!customersBatch || customersBatch.length === 0) break;

      for (const cust of customersBatch) {
        try {
          const result = await this.classifyCustomer(cust.customerId);
          processedCount++;

          if (result.classificationStatus === ClassificationStatus.CLASSIFIED) {
            classifiedCount++;
            if (result.segments.length > 1) {
              multiSegmentCount++;
            }
          } else if (result.classificationStatus === ClassificationStatus.INSUFFICIENT_DATA) {
            insufficientDataCount++;
          }
        } catch (err: unknown) {
          failedCount++;
          const errorMsg = err instanceof Error ? err.message : String(err);
          errors.push({ customerId: cust.customerId, error: errorMsg });
          logger.error(`Error classifying customer ${cust.customerId}: ${errorMsg}`, 'SegmentationService');
        }
      }

      skip += batchSize;
    }

    const durationMs = Date.now() - startTime;
    logger.info(
      `Batch classification completed in ${durationMs}ms: Processed ${processedCount}, Classified ${classifiedCount}, Insufficient ${insufficientDataCount}, Failed ${failedCount}`,
      'SegmentationService'
    );

    return {
      totalCustomers,
      processedCount,
      classifiedCount,
      insufficientDataCount,
      failedCount,
      multiSegmentCount,
      durationMs,
      errors: errors.length > 0 ? errors.slice(0, 50) : undefined
    };
  }

  /**
   * Retrieves paginated customers belonging to a specific segment (or all segments).
   */
  static async getCustomersBySegment(
    segmentName: CustomerSegmentType | 'ALL',
    pagination: PaginationQueryOptions,
    filters: SegmentationQueryFilters = {}
  ): Promise<{
    classifications: Array<Record<string, unknown>>;
    meta: PaginationMeta;
  }> {
    const query: Record<string, unknown> = {};

    if (segmentName !== 'ALL') {
      // Matches either primarySegment or multi-segment array
      query.$or = [{ primarySegment: segmentName }, { segments: segmentName }];
    }

    if (filters.primarySegment) {
      query.primarySegment = filters.primarySegment;
    }

    if (filters.status) {
      query.classificationStatus = filters.status;
    }

    if (filters.minConfidence !== undefined) {
      query.confidence = { $gte: filters.minConfidence };
    }

    if (filters.search) {
      const searchRegex = new RegExp(filters.search.trim(), 'i');
      query.$or = [
        { customerId: searchRegex },
        { 'evidence.activePlan': searchRegex }
      ];
    }

    const [records, total] = await Promise.all([
      CustomerClassificationModel.find(query)
        .populate('customerRef', 'firstName lastName email customerType accountStatus loyaltyInfo')
        .sort({ [pagination.sortBy]: pagination.sortOrder })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      CustomerClassificationModel.countDocuments(query)
    ]);

    // Format output with customer details
    const formatted = records.map((rec) => {
      const custDoc = rec.customerRef as unknown as {
        firstName?: string;
        lastName?: string;
        email?: string;
        customerType?: string;
        accountStatus?: string;
        loyaltyInfo?: { tier?: string; points?: number };
      } | null;

      return {
        id: rec._id,
        customerId: rec.customerId,
        customerName: custDoc ? `${custDoc.firstName || ''} ${custDoc.lastName || ''}`.trim() : 'Unknown',
        email: custDoc?.email || '',
        customerType: custDoc?.customerType || '',
        accountStatus: custDoc?.accountStatus || '',
        primarySegment: rec.primarySegment,
        segments: rec.segments,
        classificationStatus: rec.classificationStatus,
        confidence: rec.confidence,
        reasonCodes: rec.reasonCodes,
        explanations: rec.explanations,
        evidence: rec.evidence,
        ruleVersion: rec.ruleVersion,
        classifiedAt: rec.classifiedAt
      };
    });

    const meta = getPaginationMeta(total, pagination.page, pagination.limit);
    return { classifications: formatted, meta };
  }

  /**
   * Calculates comprehensive segmentation statistics across the customer base.
   */
  static async getStatistics(): Promise<ISegmentationStatistics> {
    const totalCustomers = await CustomerModel.countDocuments({
      accountStatus: { $ne: 'ARCHIVED' }
    });

    const [
      classifiedCustomers,
      insufficientDataCustomers,
      multiSegmentCustomers,
      primarySegmentAgg,
      allSegmentsAgg,
      latestRun
    ] = await Promise.all([
      CustomerClassificationModel.countDocuments({
        classificationStatus: ClassificationStatus.CLASSIFIED
      }),
      CustomerClassificationModel.countDocuments({
        classificationStatus: ClassificationStatus.INSUFFICIENT_DATA
      }),
      CustomerClassificationModel.countDocuments({
        'segments.1': { $exists: true } // Array length >= 2
      }),
      CustomerClassificationModel.aggregate([
        { $match: { primarySegment: { $ne: null } } },
        { $group: { _id: '$primarySegment', count: { $sum: 1 } } }
      ]),
      CustomerClassificationModel.aggregate([
        { $unwind: '$segments' },
        { $group: { _id: '$segments', count: { $sum: 1 } } }
      ]),
      CustomerClassificationModel.findOne().sort({ classifiedAt: -1 }).select('classifiedAt').lean()
    ]);

    const unclassifiedCustomers = Math.max(0, totalCustomers - (classifiedCustomers + insufficientDataCustomers));

    const segmentCounts: Record<CustomerSegmentType, number> = {
      [CustomerSegmentType.CONSISTENT_CUSTOMER]: 0,
      [CustomerSegmentType.LOYALTY_CANDIDATE]: 0,
      [CustomerSegmentType.DECLINING_ACTIVITY]: 0,
      [CustomerSegmentType.INACTIVE]: 0,
      [CustomerSegmentType.OVERDUE_BILL]: 0
    };

    const primarySegmentCounts: Record<CustomerSegmentType, number> = {
      [CustomerSegmentType.CONSISTENT_CUSTOMER]: 0,
      [CustomerSegmentType.LOYALTY_CANDIDATE]: 0,
      [CustomerSegmentType.DECLINING_ACTIVITY]: 0,
      [CustomerSegmentType.INACTIVE]: 0,
      [CustomerSegmentType.OVERDUE_BILL]: 0
    };

    const segmentPercentages: Record<CustomerSegmentType, number> = {
      [CustomerSegmentType.CONSISTENT_CUSTOMER]: 0,
      [CustomerSegmentType.LOYALTY_CANDIDATE]: 0,
      [CustomerSegmentType.DECLINING_ACTIVITY]: 0,
      [CustomerSegmentType.INACTIVE]: 0,
      [CustomerSegmentType.OVERDUE_BILL]: 0
    };

    allSegmentsAgg.forEach((item: { _id: string; count: number }) => {
      if (item._id in segmentCounts) {
        segmentCounts[item._id as CustomerSegmentType] = item.count;
      }
    });

    primarySegmentAgg.forEach((item: { _id: string; count: number }) => {
      if (item._id in primarySegmentCounts) {
        primarySegmentCounts[item._id as CustomerSegmentType] = item.count;
      }
    });

    const baseForPercentage = classifiedCustomers > 0 ? classifiedCustomers : 1;
    for (const key of Object.values(CustomerSegmentType)) {
      segmentPercentages[key] =
        Math.round(((segmentCounts[key] || 0) / baseForPercentage) * 1000) / 10;
    }

    return {
      totalCustomers,
      classifiedCustomers,
      unclassifiedCustomers,
      insufficientDataCustomers,
      multiSegmentCustomers,
      segmentCounts,
      segmentPercentages,
      primarySegmentCounts,
      lastRunTimestamp: latestRun ? latestRun.classifiedAt : null
    };
  }

  /**
   * Returns metadata and definitions for the 5 primary customer segments.
   */
  static getSegmentDefinitions() {
    return Object.entries(SEGMENT_DEFINITIONS).map(([key, def]) => ({
      segmentKey: key,
      name: def.name,
      description: def.description,
      priority: def.priority
    }));
  }
}

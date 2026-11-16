import { CustomerSegmentType } from '../segmentation/segmentation.constants.js';
import { StrategyConfigModel } from './strategies.model.js';
import { IStrategyConfig, StrategyEvaluationResult } from './strategies.types.js';
import { DEFAULT_STRATEGY_CONFIGS } from './strategies.constants.js';
import { StrategyRulesEngine } from './strategy-rules.js';
import { CustomerRepository } from '../customers/customer.repository.js';
import { CustomerClassificationModel } from '../segmentation/segmentation.model.js';
import { SegmentationService } from '../segmentation/segmentation.service.js';
import { BillingPoliciesService } from '../billing-policies/billing-policies.service.js';
import { logger } from '../../utils/logger.js';

export class StrategiesService {
  /**
   * Ensure default strategy configurations exist in the database.
   */
  static async bootstrapDefaults(): Promise<void> {
    const existingCount = await StrategyConfigModel.countDocuments();
    if (existingCount === 0) {
      const docs = Object.values(DEFAULT_STRATEGY_CONFIGS).map((cfg) => ({
        ...cfg,
        isActive: true
      }));
      await StrategyConfigModel.insertMany(docs);
      logger.info('Initialized default strategy configurations', 'StrategiesService');
    }
  }

  /**
   * Retrieves all strategy configs as a dictionary mapped by segment.
   */
  static async getConfigMap(): Promise<Record<CustomerSegmentType, IStrategyConfig>> {
    await this.bootstrapDefaults();
    const docs = await StrategyConfigModel.find({ isActive: true }).lean();
    const map = { ...DEFAULT_STRATEGY_CONFIGS };
    for (const doc of docs) {
      map[doc.segment as CustomerSegmentType] = doc as unknown as IStrategyConfig;
    }
    return map;
  }

  /**
   * Lists all strategy configurations.
   */
  static async listConfigs(): Promise<IStrategyConfig[]> {
    await this.bootstrapDefaults();
    const docs = await StrategyConfigModel.find().sort({ priority: 1 }).lean();
    return docs as unknown as IStrategyConfig[];
  }

  /**
   * Retrieves a single strategy configuration by segment type.
   */
  static async getConfigBySegment(segment: CustomerSegmentType): Promise<IStrategyConfig> {
    await this.bootstrapDefaults();
    const doc = await StrategyConfigModel.findOne({ segment }).lean();
    if (!doc) {
      if (DEFAULT_STRATEGY_CONFIGS[segment]) {
        return DEFAULT_STRATEGY_CONFIGS[segment];
      }
      throw new Error('STRATEGY_CONFIG_NOT_FOUND');
    }
    return doc as unknown as IStrategyConfig;
  }

  /**
   * Updates a strategy configuration for a given segment.
   */
  static async updateConfig(
    segment: CustomerSegmentType,
    updates: Partial<IStrategyConfig>
  ): Promise<IStrategyConfig> {
    await this.bootstrapDefaults();
    const updated = await StrategyConfigModel.findOneAndUpdate(
      { segment },
      { $set: updates },
      { new: true, upsert: true }
    ).lean();

    return updated as unknown as IStrategyConfig;
  }

  /**
   * Evaluates the recommended engagement strategy for a customer using their classification and billing data.
   */
  static async evaluateCustomerStrategy(customerId: string): Promise<StrategyEvaluationResult> {
    const customer = await CustomerRepository.findByIdOrCustomerId(customerId);
    if (!customer) {
      throw new Error('CUSTOMER_NOT_FOUND');
    }

    // 1. Fetch latest classification or perform on-the-fly classification
    let segments: CustomerSegmentType[] = [];
    const existing = await CustomerClassificationModel.findOne({ customerId: customer.customerId }).lean();
    if (existing && existing.segments && existing.segments.length > 0) {
      segments = (existing.segments as (CustomerSegmentType | null)[])
        .filter((s): s is CustomerSegmentType => s !== null && Object.values(CustomerSegmentType).includes(s));
    } else {
      const result = await SegmentationService.classifyCustomer(customer.customerId);
      segments = (result.segments as (CustomerSegmentType | null)[])
        .filter((s): s is CustomerSegmentType => s !== null && Object.values(CustomerSegmentType).includes(s));
    }

    if (segments.length === 0) {
      segments = [CustomerSegmentType.CONSISTENT_CUSTOMER];
    }

    // 2. Fetch strategy configs & billing status
    const [configMap, billingEval] = await Promise.all([
      this.getConfigMap(),
      BillingPoliciesService.evaluateCustomerBilling(customer.customerId)
    ]);

    const totalOverdue = Object.values(billingEval.totalOverdueByCurrency).reduce((a, b) => a + b, 0);
    const hasOverdueBalance = totalOverdue > 0;

    return StrategyRulesEngine.evaluateStrategy(segments, configMap, {
      hasOverdueBalance,
      overdueAmount: totalOverdue
    });
  }
}

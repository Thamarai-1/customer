import { CustomerRepository } from '../customers/customer.repository.js';
import { BillingRecordModel, IBillingRecord } from '../billing/billing-record.model.js';
import { BillingPolicyConfigModel } from './billing-policies.model.js';
import { IBillingPolicyConfig, IBillingReminderEvaluation } from './billing-policies.types.js';
import { DEFAULT_BILLING_POLICY_CONFIG } from './billing-policies.constants.js';
import { ReminderEvaluator } from './reminder-evaluator.js';
import { logger } from '../../utils/logger.js';

export class BillingPoliciesService {
  /**
   * Retrieves active billing policy configuration, bootstrapping defaults if none exist.
   */
  static async getConfig(): Promise<IBillingPolicyConfig> {
    const doc = await BillingPolicyConfigModel.findOne().lean();
    if (doc) {
      return doc as unknown as IBillingPolicyConfig;
    }

    const created = await BillingPolicyConfigModel.create(DEFAULT_BILLING_POLICY_CONFIG);
    logger.info('Initialized default billing policy configuration', 'BillingPoliciesService');
    return created.toObject() as unknown as IBillingPolicyConfig;
  }

  /**
   * Updates billing policy thresholds and rules.
   */
  static async updateConfig(updates: Partial<IBillingPolicyConfig>): Promise<IBillingPolicyConfig> {
    const existing = await BillingPolicyConfigModel.findOne();
    if (!existing) {
      const created = await BillingPolicyConfigModel.create({
        ...DEFAULT_BILLING_POLICY_CONFIG,
        ...updates
      });
      return created.toObject() as unknown as IBillingPolicyConfig;
    }

    const updated = await BillingPolicyConfigModel.findByIdAndUpdate(
      existing._id,
      { $set: updates },
      { new: true }
    ).lean();

    return updated as unknown as IBillingPolicyConfig;
  }

  /**
   * Evaluates billing records for a specific customer against policy rules.
   */
  static async evaluateCustomerBilling(
    customerIdOrId: string,
    asOfDate: Date = new Date()
  ): Promise<IBillingReminderEvaluation> {
    const customer = await CustomerRepository.findByIdOrCustomerId(customerIdOrId);
    if (!customer) {
      throw new Error('CUSTOMER_NOT_FOUND');
    }

    const [invoices, config] = await Promise.all([
      BillingRecordModel.find({
        $or: [{ customerId: customer.customerId }, { customerRef: customer._id }]
      }).lean(),
      this.getConfig()
    ]);

    return ReminderEvaluator.evaluate(
      customer.customerId,
      invoices as unknown as IBillingRecord[],
      config,
      asOfDate
    );
  }
}

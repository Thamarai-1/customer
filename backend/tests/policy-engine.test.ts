import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import {
  startTestDatabase,
  stopTestDatabase,
  clearTestDatabase,
  createTestUser
} from './test-helper.js';
import { UserRole } from '../src/modules/users/user.model.js';
import { CustomerModel, CustomerType, AccountStatus, LoyaltyTier, PlanStatus } from '../src/modules/customers/customer.model.js';
import { ActivityModel, ActivityType } from '../src/modules/activities/activity.model.js';
import { BillingRecordModel, PaymentStatus, InvoiceStatus } from '../src/modules/billing/billing-record.model.js';
import { CommunicationPreferenceModel, PreferredChannel } from '../src/modules/communications/preference.model.js';
import { CampaignModel } from '../src/modules/campaigns/campaigns.model.js';
import { OfferModel } from '../src/modules/offers/offers.model.js';
import { CampaignStatus, CampaignObjective } from '../src/modules/campaigns/campaigns.types.js';
import { OfferType, OfferStatus, OfferValueType } from '../src/modules/offers/offers.types.js';
import { CustomerSegmentType } from '../src/modules/segmentation/segmentation.constants.js';
import { StrategyRulesEngine } from '../src/modules/strategies/strategy-rules.js';
import { StrategyObjective, CommunicationTone } from '../src/modules/strategies/strategies.types.js';
import { PolicyEngineService } from '../src/modules/policy-engine/policy-engine.service.js';
import { ReminderStage } from '../src/modules/billing-policies/billing-policies.types.js';

describe('Phase 4: Strategy Rules Engine & Central Policy Engine Orchestration', () => {
  let marketingToken: string;

  beforeAll(async () => {
    await startTestDatabase();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    const marketing = await createTestUser(UserRole.MARKETING_MANAGER, 'marketing@example.com');
    marketingToken = marketing.accessToken;
  });

  describe('Deterministic Strategy Conflict Resolution Rules', () => {
    it('prioritizes OVERDUE_BILL (Priority 1) over LOYALTY_CANDIDATE (Priority 4) and suppresses promotions', () => {
      const segments = [CustomerSegmentType.LOYALTY_CANDIDATE, CustomerSegmentType.OVERDUE_BILL];
      const result = StrategyRulesEngine.evaluateStrategy(segments, undefined, {
        hasOverdueBalance: true,
        overdueAmount: 180
      });

      expect(result.primarySegment).toBe(CustomerSegmentType.OVERDUE_BILL);
      expect(result.secondarySegments).toContain(CustomerSegmentType.LOYALTY_CANDIDATE);
      expect(result.primaryObjective).toBe(StrategyObjective.PAYMENT_RESOLUTION);
      expect(result.recommendedTone).toBe(CommunicationTone.CLEAR_COURTEOUS_FIRM);
      expect(result.suppressPromotions).toBe(true);
      expect(result.reasoning.some((r) => r.includes('OVERDUE_BILL (Priority 1) takes precedence'))).toBe(true);
    });

    it('prioritizes INACTIVE (Priority 2) over LOYALTY_CANDIDATE (Priority 4) for dormant customer', () => {
      const segments = [CustomerSegmentType.INACTIVE, CustomerSegmentType.LOYALTY_CANDIDATE];
      const result = StrategyRulesEngine.evaluateStrategy(segments);

      expect(result.primarySegment).toBe(CustomerSegmentType.INACTIVE);
      expect(result.primaryObjective).toBe(StrategyObjective.WIN_BACK);
      expect(result.recommendedTone).toBe(CommunicationTone.ATTENTIVE_VALUE_FOCUSED);
      expect(result.reasoning.some((r) => r.includes('Dormancy override'))).toBe(true);
    });

    it('maps CONSISTENT_CUSTOMER to RELATIONSHIP_NURTURE with WARM_APPRECIATIVE tone', () => {
      const segments = [CustomerSegmentType.CONSISTENT_CUSTOMER];
      const result = StrategyRulesEngine.evaluateStrategy(segments);

      expect(result.primarySegment).toBe(CustomerSegmentType.CONSISTENT_CUSTOMER);
      expect(result.primaryObjective).toBe(StrategyObjective.RELATIONSHIP_NURTURE);
      expect(result.recommendedTone).toBe(CommunicationTone.WARM_APPRECIATIVE);
      expect(result.suppressPromotions).toBe(false);
    });
  });

  describe('End-to-End Policy Engine Orchestration', () => {
    it('evaluates a VIP customer, matches active campaign, qualifies for offer, and produces message context', async () => {
      // 1. Create VIP Customer
      const vipCustomer = await CustomerModel.create({
        customerId: 'CUST-VIP-001',
        firstName: 'Sophia',
        lastName: 'Taylor',
        email: 'sophia.taylor@example.com',
        customerType: CustomerType.INDIVIDUAL,
        accountStatus: AccountStatus.ACTIVE,
        loyaltyInfo: {
          loyaltyTier: LoyaltyTier.PLATINUM,
          loyaltyPoints: 750,
          membershipStartDate: new Date('2024-01-01')
        },
        subscription: {
          activePlan: 'ENTERPRISE_PREMIUM',
          planType: 'TELECOM',
          planStatus: PlanStatus.ACTIVE,
          planStartDate: new Date('2024-01-01')
        },
        source: 'DIRECT'
      });

      // 2. High activity history
      for (let i = 0; i < 15; i++) {
        await ActivityModel.create({
          customerId: vipCustomer.customerId,
          customerRef: vipCustomer._id,
          activityType: ActivityType.LOGIN,
          source: 'WEB_PORTAL',
          activityDate: new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000)
        });
      }

      // 3. Clean paid billing history
      await BillingRecordModel.create({
        customerId: vipCustomer.customerId,
        customerRef: vipCustomer._id,
        invoiceId: 'INV-VIP-PAID',
        invoiceAmount: 200,
        outstandingAmount: 0,
        currency: 'USD',
        invoiceDate: new Date('2026-04-01'),
        dueDate: new Date('2026-04-15'),
        paymentDate: new Date('2026-04-10'),
        paymentStatus: PaymentStatus.PAID,
        invoiceStatus: InvoiceStatus.ACTIVE,
        disputeStatus: 'NONE'
      });

      // 4. Communication preferences
      await CommunicationPreferenceModel.create({
        customerId: vipCustomer.customerId,
        customerRef: vipCustomer._id,
        emailConsent: true,
        smsConsent: true,
        preferredChannel: PreferredChannel.EMAIL,
        optedOut: false
      });

      // 5. Active Campaign & Offer
      const vipOffer = await OfferModel.create({
        offerCode: 'OFFER-VIP-DOUBLE',
        name: 'VIP Double Points',
        description: 'Earn 2x points on renewals',
        offerType: OfferType.LOYALTY_POINTS,
        value: 2,
        valueType: OfferValueType.POINTS,
        currency: 'USD',
        targetSegments: [CustomerSegmentType.LOYALTY_CANDIDATE],
        eligibilityRules: {
          minimumLoyaltyPoints: 500,
          minimumMembershipDays: 180,
          requiredLoyaltyTiers: ['GOLD', 'PLATINUM'],
          maxOverdueBalance: 0
        },
        validFrom: new Date('2026-01-01'),
        validUntil: new Date('2027-12-31'),
        allowedChannels: ['EMAIL', 'SMS'],
        status: OfferStatus.ACTIVE
      });

      const vipCampaign = await CampaignModel.create({
        campaignCode: 'CAMP-VIP-2026',
        name: 'VIP Loyalty Program',
        description: 'VIP appreciation rewards',
        objective: CampaignObjective.LOYALTY_REWARD,
        targetSegments: [CustomerSegmentType.LOYALTY_CANDIDATE],
        status: CampaignStatus.ACTIVE,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2027-12-31'),
        allowedChannels: ['EMAIL'],
        offerIds: [vipOffer._id]
      });

      // 6. Execute Policy Evaluation
      const report = await PolicyEngineService.evaluateCustomerPolicy(vipCustomer.customerId);

      expect(report.customerSummary.customerId).toBe(vipCustomer.customerId);
      expect(report.strategy.primarySegment).toBe(CustomerSegmentType.LOYALTY_CANDIDATE);
      expect(report.strategy.primaryObjective).toBe(StrategyObjective.LOYALTY_RECOGNITION);
      expect(report.strategy.recommendedTone).toBe(CommunicationTone.CELEBRATORY_INCENTIVIZING);
      expect(report.campaigns.matchedActiveCampaigns.length).toBeGreaterThan(0);
      expect(report.offers.eligibleOffers.length).toBeGreaterThan(0);
      expect(report.offers.eligibleOffers[0]?.offerCode).toBe('OFFER-VIP-DOUBLE');
      expect(report.billing.highestStage).toBe(ReminderStage.NONE);
      expect(report.recommendation.primaryAction).toBe('DISPATCH_ENGAGEMENT_OFFER');
      expect(report.recommendation.primaryOfferCode).toBe('OFFER-VIP-DOUBLE');
      expect(report.recommendation.messageGenerationContext.offerDetails?.name).toBe('VIP Double Points');

      // 7. Verify audit persistence via HTTP endpoint
      const latestRes = await request(app)
        .get(`/api/v1/policy-engine/customers/${vipCustomer.customerId}/latest`)
        .set('Authorization', `Bearer ${marketingToken}`);

      expect(latestRes.status).toBe(200);
      expect(latestRes.body.data.evaluationId).toBeDefined();
      expect(latestRes.body.data.customerSummary.customerId).toBe(vipCustomer.customerId);
    });

    it('evaluates a customer with >30d overdue invoice, flags ESCALATION_REVIEW, and suppresses offers', async () => {
      const delinquentCustomer = await CustomerModel.create({
        customerId: 'CUST-DELINQUENT-001',
        firstName: 'Bob',
        lastName: 'Miller',
        email: 'bob.miller@example.com',
        customerType: CustomerType.INDIVIDUAL,
        accountStatus: AccountStatus.ACTIVE,
        loyaltyInfo: {
          loyaltyTier: LoyaltyTier.GOLD,
          loyaltyPoints: 400,
          membershipStartDate: new Date('2024-01-01')
        },
        subscription: {
          activePlan: 'STANDARD',
          planType: 'TELECOM',
          planStatus: PlanStatus.ACTIVE,
          planStartDate: new Date('2024-01-01')
        },
        source: 'DIRECT'
      });

      // Overdue invoice 40 days past due
      await BillingRecordModel.create({
        customerId: delinquentCustomer.customerId,
        customerRef: delinquentCustomer._id,
        invoiceId: 'INV-DELINQUENT-40D',
        invoiceAmount: 320,
        outstandingAmount: 320,
        currency: 'USD',
        invoiceDate: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days overdue
        paymentStatus: PaymentStatus.OVERDUE,
        invoiceStatus: InvoiceStatus.ACTIVE,
        disputeStatus: 'NONE'
      });

      // Active offer with zero overdue balance requirement
      await OfferModel.create({
        offerCode: 'OFFER-DISCOUNT-10',
        name: '$10 Standard Discount',
        description: 'Standard retention discount',
        offerType: OfferType.FIXED_DISCOUNT,
        value: 10,
        valueType: OfferValueType.FIXED_AMOUNT,
        targetSegments: [CustomerSegmentType.OVERDUE_BILL, CustomerSegmentType.CONSISTENT_CUSTOMER],
        eligibilityRules: {
          maxOverdueBalance: 0
        },
        validFrom: new Date('2026-01-01'),
        validUntil: new Date('2027-12-31'),
        status: OfferStatus.ACTIVE
      });

      const report = await PolicyEngineService.evaluateCustomerPolicy(delinquentCustomer.customerId);

      expect(report.strategy.primarySegment).toBe(CustomerSegmentType.OVERDUE_BILL);
      expect(report.strategy.suppressPromotions).toBe(true);
      expect(report.billing.highestStage).toBe(ReminderStage.ESCALATION_REVIEW);
      expect(report.billing.requiresHumanReview).toBe(true);
      expect(report.recommendation.primaryAction).toBe('ESCALATE_FOR_HUMAN_APPROVAL');
      expect(report.recommendation.requiresHumanReview).toBe(true);
      expect(report.offers.eligibleOffers.length).toBe(0);
      expect(report.offers.ineligibleOffers.length).toBeGreaterThan(0);
    });

    it('flags customer who has opted out of communication channels with outreach warning', async () => {
      const optedOutCustomer = await CustomerModel.create({
        customerId: 'CUST-OPTEDOUT-001',
        firstName: 'Sarah',
        lastName: 'Connor',
        email: 'sarah.connor@example.com',
        customerType: CustomerType.INDIVIDUAL,
        accountStatus: AccountStatus.ACTIVE,
        loyaltyInfo: {
          loyaltyTier: LoyaltyTier.BRONZE,
          loyaltyPoints: 50,
          membershipStartDate: new Date('2025-01-01')
        },
        subscription: {
          activePlan: 'BASIC',
          planType: 'TELECOM',
          planStatus: PlanStatus.ACTIVE,
          planStartDate: new Date('2025-01-01')
        },
        source: 'DIRECT'
      });

      await CommunicationPreferenceModel.create({
        customerId: optedOutCustomer.customerId,
        customerRef: optedOutCustomer._id,
        emailConsent: false,
        smsConsent: false,
        preferredChannel: PreferredChannel.EMAIL,
        optedOut: true
      });

      const report = await PolicyEngineService.evaluateCustomerPolicy(optedOutCustomer.customerId);

      expect(report.channelConsent.optedOut).toBe(true);
      expect(report.channelConsent.isEligibleForOutreach).toBe(false);
      expect(report.channelConsent.outreachWarning).toBeDefined();
    });
  });
});

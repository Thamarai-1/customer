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
import { AIProviderFactory } from '../src/modules/ai/ai-provider.factory.js';
import { AIProviderType, AIRequest, AIResponse } from '../src/modules/ai/ai-provider.types.js';
import { IAIProvider } from '../src/modules/ai/ai-provider.interface.js';
import { MessageGenerationStatus, GroundingStatus } from '../src/modules/message-generation/message-generation.constants.js';
import { IGeneratedEmailStructured } from '../src/modules/message-generation/message-generation.types.js';
import { GeneratedMessageModel } from '../src/modules/message-generation/message-generation.model.js';

describe('Phase 5: GenAI Message Generation Workflow & Integration Tests', () => {
  let adminToken: string;
  let marketingToken: string;
  let complianceToken: string;

  beforeAll(async () => {
    await startTestDatabase();
  }, 30000);

  afterAll(async () => {
    await stopTestDatabase();
  }, 30000);

  beforeEach(async () => {
    await clearTestDatabase();
    AIProviderFactory.clearMockProviders();

    const admin = await createTestUser(UserRole.ADMIN, 'admin@example.com');
    adminToken = admin.accessToken;

    const marketing = await createTestUser(UserRole.MARKETING_MANAGER, 'marketing@example.com');
    marketingToken = marketing.accessToken;

    const compliance = await createTestUser(UserRole.COMPLIANCE_REVIEWER, 'compliance@example.com');
    complianceToken = compliance.accessToken;
  });

  const setupPreference = async (
    customer: any,
    options: { emailConsent?: boolean; smsConsent?: boolean; optedOut?: boolean } = {}
  ) => {
    return CommunicationPreferenceModel.create({
      customerId: customer.customerId,
      customerRef: customer._id,
      emailConsent: options.emailConsent ?? true,
      smsConsent: options.smsConsent ?? true,
      preferredChannel: PreferredChannel.EMAIL,
      optedOut: options.optedOut ?? false,
      consentSource: 'SYSTEM_TEST'
    });
  };

  const registerMockLLM = (customGenerator?: (req: AIRequest<any>) => Partial<IGeneratedEmailStructured>) => {
    const mockProvider: IAIProvider = {
      providerName: AIProviderType.OPENAI,
      defaultModel: 'mock-gpt-4o',
      isAvailable: () => true,
      generateStructuredOutput: async <T>(req: AIRequest<T>): Promise<AIResponse<T>> => {
        let payload: IGeneratedEmailStructured = {
          subject: 'Thank You for Being a Valued Member',
          body: 'Dear Marcus,\n\nWe truly appreciate your continued loyalty and partnership with us.\nAs a Gold member on the Unlimited Pro plan, you have been a vital part of our community.\n\nWarm regards,\nCustomer Engagement Team',
          objective: 'CUSTOMER_APPRECIATION',
          tone: ['WARM_APPRECIATIVE'],
          referencedOffers: [],
          referencedBillingFacts: []
        };

        if (customGenerator) {
          payload = { ...payload, ...customGenerator(req) };
        }

        return {
          data: payload as unknown as T,
          rawContent: JSON.stringify(payload),
          provider: AIProviderType.OPENAI,
          model: 'mock-gpt-4o',
          latencyMs: 45,
          tokenUsage: { promptTokens: 350, completionTokens: 120, totalTokens: 470 }
        };
      }
    };

    AIProviderFactory.registerMockProvider(AIProviderType.OPENAI, mockProvider);
    AIProviderFactory.registerMockProvider(AIProviderType.GEMINI, { ...mockProvider, providerName: AIProviderType.GEMINI });
    AIProviderFactory.registerMockProvider(AIProviderType.ANTHROPIC, { ...mockProvider, providerName: AIProviderType.ANTHROPIC });
  };

  describe('Scenario 1: Consistent Customer Appreciation Message', () => {
    it('generates grounded appreciation email for consistent customer', async () => {
      registerMockLLM();

      const customer = await CustomerModel.create({
        customerId: 'CUST-CONSISTENT-01',
        firstName: 'Marcus',
        lastName: 'Vance',
        email: 'marcus.vance@example.com',
        customerType: CustomerType.INDIVIDUAL,
        accountStatus: AccountStatus.ACTIVE,
        loyaltyInfo: {
          loyaltyTier: LoyaltyTier.GOLD,
          loyaltyPoints: 340,
          membershipStartDate: new Date('2024-01-01')
        },
        subscription: {
          activePlan: 'Unlimited Pro',
          planType: 'TELECOM',
          planStatus: PlanStatus.ACTIVE,
          planStartDate: new Date('2024-01-01')
        }
      });

      await setupPreference(customer);

      const now = new Date();
      for (let i = 0; i < 5; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 6);
        await ActivityModel.create({
          customerId: customer.customerId,
          customerRef: customer._id,
          activityType: ActivityType.LOGIN,
          source: 'WEB_PORTAL',
          activityDate: d
        });
      }

      const res = await request(app)
        .post(`/api/v1/message-generation/customers/${customer._id}/generate`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ provider: AIProviderType.OPENAI });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const draft = res.body.data;
      expect(draft.customerId).toBe(customer.customerId);
      expect(draft.generationStatus).toBe(MessageGenerationStatus.GENERATED);
      expect(draft.groundingStatus).toBe(GroundingStatus.PASSED);
      expect(draft.subject).toContain('Thank You');
      expect(draft.body).toBeDefined();
      expect(draft.promptVersion).toBe('1.0.0');
      expect(draft.latencyMs).toBeGreaterThan(0);

      const persisted = await GeneratedMessageModel.findById(draft._id);
      expect(persisted).not.toBeNull();
      expect(persisted?.generationStatus).toBe(MessageGenerationStatus.GENERATED);
    });
  });

  describe('Scenario 2: Loyalty Candidate Offer Reward Message', () => {
    it('generates reward email with verified offer code grounding', async () => {
      await CampaignModel.create({
        campaignCode: 'LOYALTY-VIP-2026',
        name: 'VIP Loyalty Celebration',
        description: 'Exclusive loyalty reward campaign',
        objective: CampaignObjective.LOYALTY_REWARD,
        status: CampaignStatus.APPROVED,
        targetSegments: [CustomerSegmentType.LOYALTY_CANDIDATE],
        startDate: new Date(Date.now() - 7 * 86400000),
        endDate: new Date(Date.now() + 30 * 86400000)
      });

      await OfferModel.create({
        offerCode: 'GOLD20OFF',
        name: '20% Loyalty Bonus',
        description: '20% off your next renewal',
        offerType: OfferType.PERCENTAGE_DISCOUNT,
        value: 20,
        valueType: OfferValueType.PERCENTAGE,
        status: OfferStatus.ACTIVE,
        targetSegments: [CustomerSegmentType.LOYALTY_CANDIDATE],
        eligibilityRules: {
          minimumMembershipDays: 180,
          requiredLoyaltyTiers: [LoyaltyTier.GOLD, LoyaltyTier.PLATINUM]
        },
        validFrom: new Date(Date.now() - 7 * 86400000),
        validUntil: new Date(Date.now() + 30 * 86400000)
      });

      const customer = await CustomerModel.create({
        customerId: 'CUST-LOYAL-02',
        firstName: 'Elena',
        lastName: 'Rostova',
        email: 'elena.rostova@example.com',
        customerType: CustomerType.INDIVIDUAL,
        accountStatus: AccountStatus.ACTIVE,
        loyaltyInfo: {
          loyaltyTier: LoyaltyTier.GOLD,
          loyaltyPoints: 1200,
          membershipStartDate: new Date(Date.now() - 400 * 86400000)
        },
        subscription: {
          activePlan: 'Unlimited Fiber',
          planType: 'BROADBAND',
          planStatus: PlanStatus.ACTIVE,
          planStartDate: new Date(Date.now() - 400 * 86400000)
        }
      });

      await setupPreference(customer);

      const now = new Date();
      for (let i = 0; i < 8; i++) {
        await ActivityModel.create({
          customerId: customer.customerId,
          customerRef: customer._id,
          activityType: ActivityType.PURCHASE,
          activityDate: new Date(now.getTime() - i * 5 * 86400000),
          source: 'STORE',
          metadata: { amount: 150 }
        });
      }

      registerMockLLM(() => ({
        subject: 'An Exclusive Loyalty Reward Just for You, Elena',
        body: 'Dear Elena,\n\nBecause of your outstanding loyalty as a Gold member, we are thrilled to grant you an exclusive 20% discount on your next plan renewal.\nSimply enter promo code GOLD20OFF at checkout.\n\nWarm regards,\nCustomer Engagement Team',
        objective: 'LOYALTY_REWARD',
        tone: ['WARM_APPRECIATIVE'],
        referencedOffers: ['GOLD20OFF'],
        referencedBillingFacts: []
      }));

      const res = await request(app)
        .post(`/api/v1/message-generation/customers/${customer._id}/generate`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ provider: AIProviderType.OPENAI });

      expect(res.status).toBe(201);
      const draft = res.body.data;
      expect(draft.generationStatus).toBe(MessageGenerationStatus.GENERATED);
      expect(draft.groundingStatus).toBe(GroundingStatus.PASSED);
      expect(draft.referencedOffers).toContain('GOLD20OFF');
      expect(draft.promptVersion).toBe('1.0.0');
    });
  });

  describe('Scenario 3: Declining Activity Re-Engagement Message', () => {
    it('generates re-engagement email for declining activity customer', async () => {
      const customer = await CustomerModel.create({
        customerId: 'CUST-DECLINING-03',
        firstName: 'David',
        lastName: 'Kim',
        email: 'david.kim@example.com',
        customerType: CustomerType.INDIVIDUAL,
        accountStatus: AccountStatus.ACTIVE,
        loyaltyInfo: {
          loyaltyTier: LoyaltyTier.SILVER,
          loyaltyPoints: 100,
          membershipStartDate: new Date(Date.now() - 300 * 86400000)
        },
        subscription: {
          activePlan: 'Mobile Basic',
          planType: 'TELECOM',
          planStatus: PlanStatus.ACTIVE,
          planStartDate: new Date(Date.now() - 300 * 86400000)
        }
      });

      await setupPreference(customer);

      const now = new Date();
      await ActivityModel.create({
        customerId: customer.customerId,
        customerRef: customer._id,
        activityType: ActivityType.LOGIN,
        activityDate: new Date(now.getTime() - 20 * 86400000),
        source: 'WEB_PORTAL'
      });
      for (let i = 0; i < 5; i++) {
        await ActivityModel.create({
          customerId: customer.customerId,
          customerRef: customer._id,
          activityType: ActivityType.LOGIN,
          activityDate: new Date(now.getTime() - (45 + i * 2) * 86400000),
          source: 'WEB_PORTAL'
        });
      }

      registerMockLLM(() => ({
        subject: 'We Miss Seeing You, David - Let Us Help You Get More Value',
        body: 'Dear David,\n\nWe noticed you have not visited your account recently and wanted to check in.\nWe have made several exciting updates to our platform to improve your experience.\n\nBest regards,\nCustomer Engagement Team',
        objective: 'RE_ENGAGEMENT',
        tone: ['HELPFUL_CONCIERGE'],
        referencedOffers: [],
        referencedBillingFacts: []
      }));

      const res = await request(app)
        .post(`/api/v1/message-generation/customers/${customer._id}/generate`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ provider: AIProviderType.OPENAI });

      expect(res.status).toBe(201);
      const draft = res.body.data;
      expect(draft.generationStatus).toBe(MessageGenerationStatus.GENERATED);
      expect(draft.groundingStatus).toBe(GroundingStatus.PASSED);
    });
  });

  describe('Scenario 4: Inactive Customer Win-Back Message', () => {
    it('generates win-back email for dormant customer with no recent activity', async () => {
      const customer = await CustomerModel.create({
        customerId: 'CUST-INACTIVE-04',
        firstName: 'Sarah',
        lastName: 'Connor',
        email: 'sarah.connor@example.com',
        customerType: CustomerType.INDIVIDUAL,
        accountStatus: AccountStatus.ACTIVE,
        loyaltyInfo: {
          loyaltyTier: LoyaltyTier.BRONZE,
          loyaltyPoints: 20,
          membershipStartDate: new Date(Date.now() - 400 * 86400000)
        },
        subscription: {
          activePlan: 'Starter',
          planType: 'TELECOM',
          planStatus: PlanStatus.ACTIVE,
          planStartDate: new Date(Date.now() - 400 * 86400000)
        }
      });

      await setupPreference(customer);

      await ActivityModel.create({
        customerId: customer.customerId,
        customerRef: customer._id,
        activityType: ActivityType.LOGIN,
        activityDate: new Date(Date.now() - 110 * 86400000),
        source: 'WEB_PORTAL'
      });

      registerMockLLM(() => ({
        subject: 'Sarah, We Want to Welcome You Back',
        body: 'Dear Sarah,\n\nIt has been a while since your last visit, and we would love the opportunity to reconnect.\nYour account is ready whenever you are.\n\nBest regards,\nCustomer Engagement Team',
        objective: 'WIN_BACK',
        tone: ['ATTENTIVE_VALUE_FOCUSED'],
        referencedOffers: [],
        referencedBillingFacts: []
      }));

      const res = await request(app)
        .post(`/api/v1/message-generation/customers/${customer._id}/generate`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ provider: AIProviderType.OPENAI });

      expect(res.status).toBe(201);
      const draft = res.body.data;
      expect(draft.generationStatus).toBe(MessageGenerationStatus.GENERATED);
      expect(draft.groundingStatus).toBe(GroundingStatus.PASSED);
    });
  });

  describe('Scenario 5: Overdue Bill Reminder Message', () => {
    it('generates respectful payment follow-up email grounded in verified invoice details', async () => {
      const customer = await CustomerModel.create({
        customerId: 'CUST-OVERDUE-05',
        firstName: 'Robert',
        lastName: 'Langdon',
        email: 'robert.langdon@example.com',
        customerType: CustomerType.INDIVIDUAL,
        accountStatus: AccountStatus.ACTIVE,
        loyaltyInfo: {
          loyaltyTier: LoyaltyTier.SILVER,
          loyaltyPoints: 120,
          membershipStartDate: new Date(Date.now() - 200 * 86400000)
        },
        subscription: {
          activePlan: 'Business Connect',
          planType: 'TELECOM',
          planStatus: PlanStatus.ACTIVE,
          planStartDate: new Date(Date.now() - 200 * 86400000)
        }
      });

      await setupPreference(customer);

      const dueDate = new Date(Date.now() - 5 * 86400000);
      await BillingRecordModel.create({
        customerId: customer.customerId,
        customerRef: customer._id,
        invoiceId: 'INV-2026-8899',
        invoiceAmount: 85.5,
        outstandingAmount: 85.5,
        currency: 'USD',
        invoiceDate: new Date(Date.now() - 35 * 86400000),
        dueDate,
        paymentStatus: PaymentStatus.OVERDUE,
        invoiceStatus: InvoiceStatus.ACTIVE,
        disputeStatus: 'NONE'
      });

      registerMockLLM(() => ({
        subject: 'Friendly Reminder: Invoice INV-2026-8899 is Due',
        body: 'Dear Robert,\n\nThis is a friendly reminder that invoice INV-2026-8899 for $85.50 was due on ' + dueDate.toLocaleDateString() + '.\nIf payment has already been sent, please disregard this notice. If you have any questions or require assistance, our support team is here to help.\n\nWarm regards,\nCustomer Engagement Team',
        objective: 'PAYMENT_REMINDER',
        tone: ['HELPFUL_COURTEOUS'],
        referencedOffers: [],
        referencedBillingFacts: ['INV-2026-8899', '85.50']
      }));

      const res = await request(app)
        .post(`/api/v1/message-generation/customers/${customer._id}/generate`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ provider: AIProviderType.OPENAI });

      expect(res.status).toBe(201);
      const draft = res.body.data;
      expect(draft.generationStatus).toBe(MessageGenerationStatus.GENERATED);
      expect(draft.groundingStatus).toBe(GroundingStatus.PASSED);
      expect(draft.body).toContain('INV-2026-8899');
    });
  });

  describe('Precondition Gates & Refusal Enforcement', () => {
    it('refuses draft generation when customer has opted out of communication', async () => {
      registerMockLLM();

      const customer = await CustomerModel.create({
        customerId: 'CUST-OPTEDOUT-01',
        firstName: 'Alice',
        lastName: 'Cooper',
        email: 'alice.cooper@example.com',
        customerType: CustomerType.INDIVIDUAL,
        accountStatus: AccountStatus.ACTIVE
      });

      await setupPreference(customer, { emailConsent: false, smsConsent: false, optedOut: true });

      const res = await request(app)
        .post(`/api/v1/message-generation/customers/${customer._id}/generate`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ provider: AIProviderType.OPENAI });

      expect(res.status).toBe(201);
      const draft = res.body.data;
      expect(draft.generationStatus).toBe(MessageGenerationStatus.REFUSED);
      expect(draft.refusalReason).toContain('opted out');
    });

    it('refuses generation when customer account is suspended or archived', async () => {
      registerMockLLM();

      const customer = await CustomerModel.create({
        customerId: 'CUST-SUSPENDED-01',
        firstName: 'Bob',
        lastName: 'Builder',
        email: 'bob.builder@example.com',
        customerType: CustomerType.INDIVIDUAL,
        accountStatus: AccountStatus.SUSPENDED
      });

      await setupPreference(customer);

      const res = await request(app)
        .post(`/api/v1/message-generation/customers/${customer._id}/generate`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ provider: AIProviderType.OPENAI });

      expect(res.status).toBe(201);
      const draft = res.body.data;
      expect(draft.generationStatus).toBe(MessageGenerationStatus.REFUSED);
      expect(draft.refusalReason).toContain('SUSPENDED');
    });

    it('returns 404 when customer ID does not exist', async () => {
      registerMockLLM();
      const fakeId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .post(`/api/v1/message-generation/customers/${fakeId}/generate`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ provider: AIProviderType.OPENAI });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Grounding Validation, Self-Correction & Exhaustion', () => {
    it('exhausts retries and persists draft as GROUNDING_FAILED when LLM persistently invents unapproved offers', async () => {
      const hallucinatingProvider: IAIProvider = {
        providerName: AIProviderType.OPENAI,
        defaultModel: 'mock-gpt-4o',
        isAvailable: () => true,
        generateStructuredOutput: async <T>(): Promise<AIResponse<T>> => {
          const fakePayload: IGeneratedEmailStructured = {
            subject: 'Fake 90% Off Offer',
            body: 'Hello Marcus,\n\nUse code FAKE_SECRET_90 for 90% off everything today!\n\nRegards',
            objective: 'CUSTOMER_APPRECIATION',
            tone: ['WARM_APPRECIATIVE'],
            referencedOffers: ['FAKE_SECRET_90'],
            referencedBillingFacts: []
          };
          return {
            data: fakePayload as unknown as T,
            rawContent: JSON.stringify(fakePayload),
            provider: AIProviderType.OPENAI,
            model: 'mock-gpt-4o',
            latencyMs: 30,
            tokenUsage: { promptTokens: 300, completionTokens: 100, totalTokens: 400 }
          };
        }
      };
      AIProviderFactory.registerMockProvider(AIProviderType.OPENAI, hallucinatingProvider);

      const customer = await CustomerModel.create({
        customerId: 'CUST-GROUNDING-FAIL',
        firstName: 'Marcus',
        lastName: 'Vance',
        email: 'marcus.vance@example.com',
        customerType: CustomerType.INDIVIDUAL,
        accountStatus: AccountStatus.ACTIVE
      });

      await setupPreference(customer);

      const res = await request(app)
        .post(`/api/v1/message-generation/customers/${customer._id}/generate`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ provider: AIProviderType.OPENAI });

      expect(res.status).toBe(201);
      const draft = res.body.data;
      expect(draft.generationStatus).toBe(MessageGenerationStatus.GROUNDING_FAILED);
      expect(draft.groundingStatus).toBe(GroundingStatus.FAILED);
      expect(draft.validationFindings.length).toBeGreaterThan(0);
      expect(draft.retryCount).toBeGreaterThanOrEqual(1);
    });

    it('self-corrects and passes grounding after retry feedback', async () => {
      let callCount = 0;
      const selfCorrectingProvider: IAIProvider = {
        providerName: AIProviderType.OPENAI,
        defaultModel: 'mock-gpt-4o',
        isAvailable: () => true,
        generateStructuredOutput: async <T>(): Promise<AIResponse<T>> => {
          callCount++;
          if (callCount === 1) {
            const badPayload: IGeneratedEmailStructured = {
              subject: 'Special Perk',
              body: 'Dear Marcus,\n\nClaim your perk with secret code BAD_CODE_99\n\nBest',
              objective: 'CUSTOMER_APPRECIATION',
              tone: ['WARM_APPRECIATIVE'],
              referencedOffers: ['BAD_CODE_99'],
              referencedBillingFacts: []
            };
            return {
              data: badPayload as unknown as T,
              rawContent: JSON.stringify(badPayload),
              provider: AIProviderType.OPENAI,
              model: 'mock-gpt-4o',
              latencyMs: 25,
              tokenUsage: { promptTokens: 300, completionTokens: 100, totalTokens: 400 }
            };
          }

          const goodPayload: IGeneratedEmailStructured = {
            subject: 'Thank You For Your Loyalty',
            body: 'Dear Marcus,\n\nWe deeply appreciate your continued partnership with us.\n\nWarm regards',
            objective: 'CUSTOMER_APPRECIATION',
            tone: ['WARM_APPRECIATIVE'],
            referencedOffers: [],
            referencedBillingFacts: []
          };
          return {
            data: goodPayload as unknown as T,
            rawContent: JSON.stringify(goodPayload),
            provider: AIProviderType.OPENAI,
            model: 'mock-gpt-4o',
            latencyMs: 25,
            tokenUsage: { promptTokens: 350, completionTokens: 100, totalTokens: 450 }
          };
        }
      };
      AIProviderFactory.registerMockProvider(AIProviderType.OPENAI, selfCorrectingProvider);

      const customer = await CustomerModel.create({
        customerId: 'CUST-SELF-CORRECT',
        firstName: 'Marcus',
        lastName: 'Vance',
        email: 'marcus.vance@example.com',
        customerType: CustomerType.INDIVIDUAL,
        accountStatus: AccountStatus.ACTIVE
      });

      await setupPreference(customer);

      const res = await request(app)
        .post(`/api/v1/message-generation/customers/${customer._id}/generate`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ provider: AIProviderType.OPENAI });

      expect(res.status).toBe(201);
      const draft = res.body.data;
      expect(draft.generationStatus).toBe(MessageGenerationStatus.GENERATED);
      expect(draft.groundingStatus).toBe(GroundingStatus.PASSED);
      expect(draft.retryCount).toBe(1);
      expect(callCount).toBe(2);
    });
  });

  describe('Message Generation API Endpoints & Versioning', () => {
    it('supports draft regeneration, creating a new draft version linked to parent', async () => {
      registerMockLLM();

      const customer = await CustomerModel.create({
        customerId: 'CUST-REGEN-01',
        firstName: 'Marcus',
        lastName: 'Vance',
        email: 'marcus.vance@example.com',
        customerType: CustomerType.INDIVIDUAL,
        accountStatus: AccountStatus.ACTIVE
      });

      await setupPreference(customer);

      const genRes = await request(app)
        .post(`/api/v1/message-generation/customers/${customer._id}/generate`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ provider: AIProviderType.OPENAI });

      expect(genRes.status).toBe(201);
      const initialDraft = genRes.body.data;
      expect(initialDraft._id).toBeDefined();

      const regenRes = await request(app)
        .post(`/api/v1/message-generation/${initialDraft._id}/regenerate`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ reason: 'Make it even warmer and mention spring update' });

      expect(regenRes.status).toBe(201);
      const newDraft = regenRes.body.data;
      expect(newDraft._id).not.toBe(initialDraft._id);
      expect(newDraft.customerId).toBe(initialDraft.customerId);

      const listRes = await request(app)
        .get(`/api/v1/message-generation/customers/${customer._id}`)
        .set('Authorization', `Bearer ${marketingToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(2);
      expect(listRes.body.meta.totalRecords).toBe(2);

      const getRes = await request(app)
        .get(`/api/v1/message-generation/${newDraft._id}`)
        .set('Authorization', `Bearer ${marketingToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data._id).toBe(newDraft._id);
    });

    it('previews generation evidence context before generating', async () => {
      const customer = await CustomerModel.create({
        customerId: 'CUST-PREVIEW-01',
        firstName: 'Marcus',
        lastName: 'Vance',
        email: 'marcus.vance@example.com',
        customerType: CustomerType.INDIVIDUAL,
        accountStatus: AccountStatus.ACTIVE,
        loyaltyInfo: {
          loyaltyTier: LoyaltyTier.GOLD,
          loyaltyPoints: 500,
          membershipStartDate: new Date('2024-01-01')
        }
      });

      await setupPreference(customer);

      const res = await request(app)
        .get(`/api/v1/message-generation/customers/${customer._id}/context`)
        .set('Authorization', `Bearer ${marketingToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.evidenceContext.customer.firstName).toBe('Marcus');
      expect(data.evidenceContext.customer.loyaltyTier).toBe(LoyaltyTier.GOLD);
      expect(data.evidenceContext.classification.primarySegment).toBeDefined();
      expect(data.evidenceContext.policyDecision.objective).toBeDefined();
    });

    it('lists AI providers via GET /api/v1/ai/providers', async () => {
      const res = await request(app)
        .get('/api/v1/ai/providers')
        .set('Authorization', `Bearer ${marketingToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);
    });

    it('gets and updates runtime generation config', async () => {
      const getRes = await request(app)
        .get('/api/v1/message-generation/config')
        .set('Authorization', `Bearer ${marketingToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.temperature).toBeDefined();

      const putRes = await request(app)
        .put('/api/v1/message-generation/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          temperature: 0.5,
          maxTokens: 1200
        });

      expect(putRes.status).toBe(200);
      expect(putRes.body.data.temperature).toBe(0.5);
      expect(putRes.body.data.maxTokens).toBe(1200);
    });
  });

  describe('RBAC & Security Verification', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post('/api/v1/message-generation/customers/507f1f77bcf86cd799439011/generate')
        .send({});

      expect(res.status).toBe(401);
    });

    it('allows COMPLIANCE_REVIEWER to read drafts and context but forbids generation', async () => {
      registerMockLLM();

      const customer = await CustomerModel.create({
        customerId: 'CUST-RBAC-01',
        firstName: 'Marcus',
        lastName: 'Vance',
        email: 'marcus.vance@example.com',
        customerType: CustomerType.INDIVIDUAL,
        accountStatus: AccountStatus.ACTIVE
      });

      await setupPreference(customer);

      const contextRes = await request(app)
        .get(`/api/v1/message-generation/customers/${customer._id}/context`)
        .set('Authorization', `Bearer ${complianceToken}`);

      expect(contextRes.status).toBe(200);

      const genRes = await request(app)
        .post(`/api/v1/message-generation/customers/${customer._id}/generate`)
        .set('Authorization', `Bearer ${complianceToken}`)
        .send({ provider: AIProviderType.OPENAI });

      expect(genRes.status).toBe(403);
    });
  });
});

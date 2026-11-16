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
import { CommunicationHistoryModel } from '../src/modules/delivery/communication-history.model.js';
import { OfferModel } from '../src/modules/offers/offers.model.js';
import { OfferType, OfferStatus, OfferValueType } from '../src/modules/offers/offers.types.js';
import { CustomerSegmentType } from '../src/modules/segmentation/segmentation.constants.js';
import { GeneratedMessageModel } from '../src/modules/message-generation/message-generation.model.js';
import { MessageGenerationStatus, GroundingStatus } from '../src/modules/message-generation/message-generation.constants.js';
import {
  CheckId,
  CheckStatus,
  SeverityLevel,
  RecommendedAction,
  OverallComplianceDecision,
  ComplianceReasonCode
} from '../src/modules/compliance/compliance.constants.js';
import { GroundingValidator } from '../src/modules/compliance/validators/grounding.validator.js';
import { OfferValidator } from '../src/modules/compliance/validators/offer.validator.js';
import { BillingValidator } from '../src/modules/compliance/validators/billing.validator.js';
import { ConsentValidator } from '../src/modules/compliance/validators/consent.validator.js';
import { FrequencyValidator } from '../src/modules/compliance/validators/frequency.validator.js';
import { DuplicateValidator } from '../src/modules/compliance/validators/duplicate.validator.js';
import { LanguageValidator } from '../src/modules/compliance/validators/language.validator.js';
import { PrivacyValidator } from '../src/modules/compliance/validators/privacy.validator.js';
import { ChannelValidator } from '../src/modules/compliance/validators/channel.validator.js';
import { DisclaimerValidator } from '../src/modules/compliance/validators/disclaimer.validator.js';
import { ContentPolicyValidator } from '../src/modules/compliance/validators/content-policy.validator.js';
import { SeverityMapper } from '../src/modules/compliance/rules/severity-mapping.js';
import { ComplianceService } from '../src/modules/compliance/compliance.service.js';
import { ComplianceValidationModel } from '../src/modules/compliance/compliance.model.js';

describe('Phase 6: Compliance Validation Engine Tests', () => {
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

    const admin = await createTestUser(UserRole.ADMIN, 'admin@example.com');
    adminToken = admin.accessToken;

    const marketing = await createTestUser(UserRole.MARKETING_MANAGER, 'marketing@example.com');
    marketingToken = marketing.accessToken;

    const compliance = await createTestUser(UserRole.COMPLIANCE_REVIEWER, 'compliance@example.com');
    complianceToken = compliance.accessToken;
  });

  const setupCustomer = async (overrides: Partial<any> = {}) => {
    return CustomerModel.create({
      customerId: overrides.customerId || 'CUST-COMP-001',
      firstName: overrides.firstName || 'Sarah',
      lastName: overrides.lastName || 'Connor',
      email: overrides.email || 'sarah.connor@example.com',
      customerType: CustomerType.INDIVIDUAL,
      accountStatus: AccountStatus.ACTIVE,
      subscription: {
        activePlan: 'PREMIUM_UNLIMITED',
        planStatus: PlanStatus.ACTIVE,
        billingCycle: 'MONTHLY',
        monthlyFee: 99.99,
        startDate: new Date('2023-01-01')
      },
      loyaltyInfo: {
        loyaltyTier: LoyaltyTier.GOLD,
        loyaltyPoints: 1250,
        enrolledAt: new Date('2023-01-01')
      },
      ...overrides
    });
  };

  const setupPreferences = async (customer: any, overrides: Partial<any> = {}) => {
    return CommunicationPreferenceModel.create({
      customerId: customer.customerId,
      customerRef: customer._id,
      preferredChannel: PreferredChannel.EMAIL,
      emailConsent: true,
      smsConsent: false,
      whatsappConsent: false,
      optedOut: false,
      ...overrides
    });
  };

  const setupGeneratedMessage = async (customer: any, overrides: Partial<any> = {}) => {
    return GeneratedMessageModel.create({
      customerId: customer.customerId,
      customerRef: customer._id,
      channel: 'EMAIL',
      primarySegment: CustomerSegmentType.CONSISTENT_CUSTOMER,
      objective: 'LOYALTY_RECOGNITION',
      subject: 'Exclusive Appreciation Reward Inside',
      body: 'Dear Sarah, as a valued Gold member, enjoy 20% off your next plan renewal. Terms and conditions apply.',
      callToAction: {
        text: 'Claim Reward',
        url: 'https://example.com/reward'
      },
      referencedOffers: ['LOYALTY20'],
      status: MessageGenerationStatus.DRAFT,
      groundingStatus: GroundingStatus.GROUNDED,
      provider: 'OPENAI',
      model: 'gpt-4o',
      promptVersion: '1.0.0',
      evidenceSnapshot: {},
      ...overrides
    });
  };

  describe('1. Individual Validators Unit Tests', () => {
    it('GroundingValidator: should detect customer name mismatch', async () => {
      const customer = await setupCustomer();
      const message = await setupGeneratedMessage(customer, {
        body: 'Dear John, thank you for being with us.'
      });

      const context: any = {
        message,
        customer,
        profile: { customer, subscription: customer.subscription },
        latestOffers: [],
        latestBillingRecords: []
      };

      const result = await GroundingValidator.execute(context);
      expect(result.status).toBe(CheckStatus.FAILED);
      expect(result.findings.some((f) => f.reasonCode === ComplianceReasonCode.INCORRECT_CUSTOMER_NAME)).toBe(true);
    });

    it('GroundingValidator: should detect unsupported discount percentage claim', async () => {
      const customer = await setupCustomer();
      const message = await setupGeneratedMessage(customer, {
        body: 'Dear Sarah, we are offering an exclusive 50% discount on all plans!'
      });

      const context: any = {
        message,
        customer,
        profile: { customer, subscription: customer.subscription },
        latestOffers: [
          {
            offerCode: 'TEN_OFF',
            value: 10,
            valueType: 'PERCENTAGE'
          }
        ],
        latestBillingRecords: []
      };

      const result = await GroundingValidator.execute(context);
      expect(result.status).toBe(CheckStatus.FAILED);
      expect(result.findings.some((f) => f.reasonCode === ComplianceReasonCode.UNSUPPORTED_NUMERICAL_CLAIM)).toBe(true);
    });

    it('OfferValidator: should block nonexistent offer code', async () => {
      const customer = await setupCustomer();
      const message = await setupGeneratedMessage(customer, {
        referencedOffers: ['GHOST_OFFER_99']
      });

      const context: any = {
        message,
        customer,
        profile: { customer },
        latestOffers: []
      };

      const result = await OfferValidator.execute(context);
      expect(result.status).toBe(CheckStatus.FAILED);
      expect(result.severity).toBe(SeverityLevel.CRITICAL);
      expect(result.findings.some((f) => f.reasonCode === ComplianceReasonCode.OFFER_NOT_FOUND)).toBe(true);
    });

    it('OfferValidator: should block expired offer', async () => {
      const customer = await setupCustomer();
      await OfferModel.create({
        offerCode: 'EXPIRED20',
        name: 'Expired Promo',
        description: 'Expired promo offer for testing',
        offerType: OfferType.PERCENTAGE_DISCOUNT,
        valueType: OfferValueType.PERCENTAGE,
        value: 20,
        status: OfferStatus.EXPIRED,
        validFrom: new Date('2022-01-01'),
        validUntil: new Date('2022-02-01')
      });

      const message = await setupGeneratedMessage(customer, {
        referencedOffers: ['EXPIRED20']
      });

      const context: any = {
        message,
        customer,
        profile: { customer },
        latestOffers: []
      };

      const result = await OfferValidator.execute(context);
      expect(result.status).toBe(CheckStatus.FAILED);
      expect(result.findings.some((f) => f.reasonCode === ComplianceReasonCode.OFFER_EXPIRED)).toBe(true);
    });

    it('BillingValidator: should block billing reminder if customer has zero overdue balance', async () => {
      const customer = await setupCustomer();
      const message = await setupGeneratedMessage(customer, {
        subject: 'Overdue Invoice Reminder',
        objective: 'PAYMENT_RESOLUTION',
        body: 'Your account balance is overdue. Please pay now.'
      });

      const context: any = {
        message,
        customer,
        latestBillingRecords: [
          {
            invoiceNumber: 'INV-100',
            invoiceAmount: 100,
            outstandingAmount: 0,
            paymentStatus: PaymentStatus.PAID
          }
        ]
      };

      const result = await BillingValidator.execute(context);
      expect(result.status).toBe(CheckStatus.FAILED);
      expect(result.severity).toBe(SeverityLevel.CRITICAL);
      expect(result.findings.some((f) => f.reasonCode === ComplianceReasonCode.INVOICE_ALREADY_PAID)).toBe(true);
    });

    it('BillingValidator: should block billing reminder if invoice is in active dispute', async () => {
      const customer = await setupCustomer();
      const message = await setupGeneratedMessage(customer, {
        subject: 'Payment Reminder for INV-DISPUTED',
        objective: 'PAYMENT_RESOLUTION',
        body: 'Please pay invoice INV-DISPUTED immediately.'
      });

      const context: any = {
        message,
        customer,
        latestBillingRecords: [
          {
            invoiceNumber: 'INV-DISPUTED',
            invoiceAmount: 150,
            outstandingAmount: 150,
            paymentStatus: PaymentStatus.OVERDUE,
            invoiceStatus: InvoiceStatus.DISPUTED,
            disputeStatus: 'UNDER_INVESTIGATION'
          }
        ]
      };

      const result = await BillingValidator.execute(context);
      expect(result.status).toBe(CheckStatus.FAILED);
      expect(result.findings.some((f) => f.reasonCode === ComplianceReasonCode.DISPUTED_INVOICE)).toBe(true);
    });

    it('ConsentValidator: should block message if customer explicitly opted out', async () => {
      const customer = await setupCustomer();
      const message = await setupGeneratedMessage(customer);

      const context: any = {
        message,
        customer,
        profile: {
          customer,
          communicationPreferences: {
            optedOut: true,
            emailConsent: false
          }
        }
      };

      const result = await ConsentValidator.execute(context);
      expect(result.status).toBe(CheckStatus.FAILED);
      expect(result.severity).toBe(SeverityLevel.CRITICAL);
      expect(result.findings.some((f) => f.reasonCode === ComplianceReasonCode.CUSTOMER_OPTED_OUT)).toBe(true);
    });

    it('ConsentValidator: should block message if channel-specific consent is missing', async () => {
      const customer = await setupCustomer();
      const message = await setupGeneratedMessage(customer, { channel: 'SMS' });

      const context: any = {
        message,
        customer,
        profile: {
          customer,
          communicationPreferences: {
            optedOut: false,
            emailConsent: true,
            smsConsent: false
          }
        }
      };

      const result = await ConsentValidator.execute(context);
      expect(result.status).toBe(CheckStatus.FAILED);
      expect(result.findings.some((f) => f.reasonCode === ComplianceReasonCode.CHANNEL_CONSENT_DENIED)).toBe(true);
    });

    it('FrequencyValidator: should fail if daily contact limit is reached', async () => {
      const customer = await setupCustomer();
      const message = await setupGeneratedMessage(customer);

      const recentTime = new Date();
      const deliveredHistory = [
        {
          deliveryStatus: 'delivered',
          channel: 'EMAIL',
          sentAt: recentTime
        },
        {
          deliveryStatus: 'delivered',
          channel: 'EMAIL',
          sentAt: new Date(recentTime.getTime() - 1000 * 60 * 60)
        }
      ];

      const context: any = {
        message,
        customer,
        communicationHistory: deliveredHistory,
        config: {
          frequencyLimits: {
            maxDailyMarketingEmails: 2,
            maxWeeklyMarketingEmails: 5,
            minIntervalHoursMarketing: 1,
            maxBillingRemindersPerMonth: 4
          }
        }
      };

      const result = await FrequencyValidator.execute(context);
      expect(result.status).toBe(CheckStatus.FAILED);
      expect(result.findings.some((f) => f.reasonCode === ComplianceReasonCode.DAILY_CONTACT_LIMIT_EXCEEDED)).toBe(true);
    });

    it('DuplicateValidator: should detect duplicate outreach sent recently', async () => {
      const customer = await setupCustomer();
      const message = await setupGeneratedMessage(customer, {
        subject: 'Renewal Exclusive 2026'
      });

      const context: any = {
        message,
        customer,
        communicationHistory: [
          {
            deliveryStatus: 'delivered',
            channel: 'EMAIL',
            sentAt: new Date(),
            subject: 'Renewal Exclusive 2026'
          }
        ],
        config: { duplicateWindowHours: 24 }
      };

      const result = await DuplicateValidator.execute(context);
      expect(result.status).toBe(CheckStatus.FAILED);
      expect(result.findings.some((f) => f.reasonCode === ComplianceReasonCode.DUPLICATE_OUTREACH_DETECTED)).toBe(true);
    });

    it('LanguageValidator: should detect legal threats and prohibited phrases', async () => {
      const customer = await setupCustomer();
      const message = await setupGeneratedMessage(customer, {
        body: 'We will take legal action and send debt collectors if you do not act now or pay immediately!'
      });

      const context: any = {
        message,
        customer,
        config: {
          blockedPhrases: ['legal action', 'debt collector', 'pay immediately']
        }
      };

      const result = await LanguageValidator.execute(context);
      expect(result.status).toBe(CheckStatus.FAILED);
      expect(result.severity).toBe(SeverityLevel.CRITICAL);
      expect(result.findings.some((f) => f.reasonCode === ComplianceReasonCode.THREATENING_LANGUAGE)).toBe(true);
    });

    it('PrivacyValidator: should detect leaked API keys and bearer tokens', async () => {
      const customer = await setupCustomer();
      const mockApiKey = ['sk', 'dummy', 'mocksecretkey123456789012345'].join('_');
      const message = await setupGeneratedMessage(customer, {
        body: `Please use this secret key ${mockApiKey} to access your portal.`
      });

      const context: any = {
        message,
        customer
      };

      const result = await PrivacyValidator.execute(context);
      expect(result.status).toBe(CheckStatus.FAILED);
      expect(result.severity).toBe(SeverityLevel.CRITICAL);
      expect(result.findings.some((f) => f.reasonCode === ComplianceReasonCode.CREDENTIAL_LEAKAGE)).toBe(true);
    });

    it('ChannelValidator: should reject unsupported communication channel', async () => {
      const customer = await setupCustomer();
      const message = await setupGeneratedMessage(customer, {
        channel: 'TELEGRAM'
      });

      const context: any = {
        message,
        latestOffers: []
      };

      const result = await ChannelValidator.execute(context);
      expect(result.status).toBe(CheckStatus.FAILED);
      expect(result.findings.some((f) => f.reasonCode === ComplianceReasonCode.CHANNEL_NOT_SUPPORTED)).toBe(true);
    });

    it('DisclaimerValidator: should flag missing terms when promotional offer is referenced', async () => {
      const customer = await setupCustomer();
      const message = await setupGeneratedMessage(customer, {
        referencedOffers: ['PROMO10'],
        body: 'Enjoy 10% off today!' // lacks terms & conditions
      });

      const context: any = {
        message,
        config: {
          requiredDisclaimers: {
            offerTermsText: 'Terms and conditions apply'
          }
        }
      };

      const result = await DisclaimerValidator.execute(context);
      expect(result.status).toBe(CheckStatus.FAILED);
      expect(result.findings.some((f) => f.reasonCode === ComplianceReasonCode.REQUIRED_TERMS_MISSING)).toBe(true);
    });

    it('ContentPolicyValidator: should block unconditional guarantees', async () => {
      const customer = await setupCustomer();
      const message = await setupGeneratedMessage(customer, {
        body: 'We give you a 100% guaranteed return on all investment with zero risk guaranteed.'
      });

      const context: any = {
        message
      };

      const result = await ContentPolicyValidator.execute(context);
      expect(result.status).toBe(CheckStatus.FAILED);
      expect(result.findings.some((f) => f.reasonCode === ComplianceReasonCode.UNSUPPORTED_GUARANTEE)).toBe(true);
    });
  });

  describe('2. Decision Aggregation & Escalation', () => {
    it('SeverityMapper: should aggregate to BLOCKED if any check has CRITICAL severity', () => {
      const checks: any[] = [
        {
          checkId: CheckId.CONSENT_PREFERENCE,
          status: CheckStatus.FAILED,
          severity: SeverityLevel.CRITICAL,
          findings: [{ severity: SeverityLevel.CRITICAL, reasonCode: ComplianceReasonCode.CUSTOMER_OPTED_OUT }]
        },
        {
          checkId: CheckId.FACTUAL_GROUNDING,
          status: CheckStatus.PASSED,
          severity: SeverityLevel.INFO,
          findings: []
        }
      ];

      const { overallStatus, decision } = SeverityMapper.aggregateDecision(checks);
      expect(overallStatus).toBe(OverallComplianceDecision.BLOCKED);
      expect(decision).toBe(RecommendedAction.BLOCK_MESSAGE);
    });

    it('SeverityMapper: should aggregate to REVISION_REQUIRED if MEDIUM findings exist without HIGH/CRITICAL', () => {
      const checks: any[] = [
        {
          checkId: CheckId.REQUIRED_DISCLAIMERS,
          status: CheckStatus.FAILED,
          severity: SeverityLevel.MEDIUM,
          findings: [{ severity: SeverityLevel.MEDIUM, reasonCode: ComplianceReasonCode.MISSING_OFFER_TERMS }]
        },
        {
          checkId: CheckId.FACTUAL_GROUNDING,
          status: CheckStatus.PASSED,
          severity: SeverityLevel.INFO,
          findings: []
        }
      ];

      const { overallStatus, decision } = SeverityMapper.aggregateDecision(checks);
      expect(overallStatus).toBe(OverallComplianceDecision.REVISION_REQUIRED);
      expect(decision).toBe(RecommendedAction.EDIT_REQUIRED);
    });

    it('SeverityMapper: should aggregate to PASS_WITH_WARNINGS if only LOW findings exist', () => {
      const checks: any[] = [
        {
          checkId: CheckId.FACTUAL_GROUNDING,
          status: CheckStatus.WARNING,
          severity: SeverityLevel.LOW,
          findings: [{ severity: SeverityLevel.LOW, reasonCode: ComplianceReasonCode.UNVERIFIED_CLAIM }]
        }
      ];

      const { overallStatus, decision } = SeverityMapper.aggregateDecision(checks);
      expect(overallStatus).toBe(OverallComplianceDecision.PASS_WITH_WARNINGS);
      expect(decision).toBe(RecommendedAction.REVIEW_REQUIRED);
    });

    it('SeverityMapper: should aggregate to PASS if all checks are passed', () => {
      const checks: any[] = [
        {
          checkId: CheckId.FACTUAL_GROUNDING,
          status: CheckStatus.PASSED,
          severity: SeverityLevel.INFO,
          findings: []
        },
        {
          checkId: CheckId.OFFER_ELIGIBILITY,
          status: CheckStatus.PASSED,
          severity: SeverityLevel.INFO,
          findings: []
        }
      ];

      const { overallStatus, decision } = SeverityMapper.aggregateDecision(checks);
      expect(overallStatus).toBe(OverallComplianceDecision.PASS);
      expect(decision).toBe(RecommendedAction.NONE);
    });
  });

  describe('3. End-to-End Compliance Service & REST APIs', () => {
    it('POST /api/v1/compliance/messages/:messageId/validate: executes full compliance validation', async () => {
      const customer = await setupCustomer();
      await setupPreferences(customer);
      await OfferModel.create({
        offerCode: 'LOYALTY20',
        name: 'Loyalty 20% Discount',
        description: 'Loyalty 20% discount offer description',
        offerType: OfferType.PERCENTAGE_DISCOUNT,
        valueType: OfferValueType.PERCENTAGE,
        value: 20,
        status: OfferStatus.ACTIVE,
        allowedChannels: ['EMAIL', 'SMS'],
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2030-01-01')
      });

      await ActivityModel.create({
        customerId: customer.customerId,
        customerRef: customer._id,
        activityType: ActivityType.LOGIN,
        source: 'WEB_PORTAL',
        activityDate: new Date()
      });

      const message = await setupGeneratedMessage(customer);

      const res = await request(app)
        .post(`/api/v1/compliance/messages/${message._id}/validate`)
        .set('Authorization', `Bearer ${complianceToken}`)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.messageId).toBe(message._id.toString());
      expect(res.body.data.checks.length).toBe(11);
      expect(res.body.data.overallStatus).toBeDefined();
    });

    it('GET /api/v1/compliance/messages/:messageId/latest: retrieves latest report', async () => {
      const customer = await setupCustomer();
      await setupPreferences(customer);
      const message = await setupGeneratedMessage(customer);

      // Validate first
      await ComplianceService.validateMessage(message._id.toString());

      const res = await request(app)
        .get(`/api/v1/compliance/messages/${message._id}/latest`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.messageId).toBe(message._id.toString());
      expect(res.body.data.checks).toBeDefined();
    });

    it('GET /api/v1/compliance/messages/:messageId/history: returns pagination of historical runs', async () => {
      const customer = await setupCustomer();
      await setupPreferences(customer);
      const message = await setupGeneratedMessage(customer);

      // Run twice
      await ComplianceService.validateMessage(message._id.toString());
      await ComplianceService.validateMessage(message._id.toString());

      const res = await request(app)
        .get(`/api/v1/compliance/messages/${message._id}/history`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.totalRecords).toBe(2);
    });

    it('GET /api/v1/compliance/reports/:reportId: returns report by ID', async () => {
      const customer = await setupCustomer();
      await setupPreferences(customer);
      const message = await setupGeneratedMessage(customer);

      const report = await ComplianceService.validateMessage(message._id.toString());

      const res = await request(app)
        .get(`/api/v1/compliance/reports/${report._id}`)
        .set('Authorization', `Bearer ${complianceToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(report._id.toString());
    });

    it('POST /api/v1/compliance/customers/:customerId/validate-drafts: validates all drafts in batch', async () => {
      const customer = await setupCustomer();
      await setupPreferences(customer);
      await setupGeneratedMessage(customer);
      await setupGeneratedMessage(customer);

      const res = await request(app)
        .post(`/api/v1/compliance/customers/${customer.customerId}/validate-drafts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('GET & PUT /api/v1/compliance/config: retrieves and updates config with RBAC protection', async () => {
      // 1. GET config
      const getRes = await request(app)
        .get('/api/v1/compliance/config')
        .set('Authorization', `Bearer ${complianceToken}`)
        .expect(200);

      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data.version).toBeDefined();

      // 2. PUT config by marketing manager should be FORBIDDEN (403)
      await request(app)
        .put('/api/v1/compliance/config')
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({ duplicateWindowHours: 48 })
        .expect(403);

      // 3. PUT config by compliance reviewer should succeed (200)
      const putRes = await request(app)
        .put('/api/v1/compliance/config')
        .set('Authorization', `Bearer ${complianceToken}`)
        .send({ duplicateWindowHours: 72 })
        .expect(200);

      expect(putRes.body.success).toBe(true);
      expect(putRes.body.data.duplicateWindowHours).toBe(72);
    });

    it('GET /api/v1/compliance/statistics: returns dashboard statistics', async () => {
      const customer = await setupCustomer();
      await setupPreferences(customer);
      const message = await setupGeneratedMessage(customer);

      await ComplianceService.validateMessage(message._id.toString());

      const res = await request(app)
        .get('/api/v1/compliance/statistics')
        .set('Authorization', `Bearer ${marketingToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.totalValidations).toBeGreaterThanOrEqual(1);
      expect(res.body.data.successRate).toBeDefined();
    });

    it('GET /api/v1/compliance/blocked-messages: lists blocked validation reports', async () => {
      const customer = await setupCustomer({ customerId: 'CUST-BLOCKED-01' });
      // Opt out customer so it gets blocked
      await setupPreferences(customer, { optedOut: true });
      const message = await setupGeneratedMessage(customer);

      await ComplianceService.validateMessage(message._id.toString());

      const res = await request(app)
        .get('/api/v1/compliance/blocked-messages?customerId=CUST-BLOCKED-01')
        .set('Authorization', `Bearer ${complianceToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].overallStatus).toBe(OverallComplianceDecision.BLOCKED);
    });
  });
});

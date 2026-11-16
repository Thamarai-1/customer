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
import { CampaignModel } from '../src/modules/campaigns/campaigns.model.js';
import { OfferModel } from '../src/modules/offers/offers.model.js';
import { CampaignStatus, CampaignObjective } from '../src/modules/campaigns/campaigns.types.js';
import { OfferType, OfferStatus, OfferValueType } from '../src/modules/offers/offers.types.js';
import { CustomerSegmentType, ClassificationStatus } from '../src/modules/segmentation/segmentation.constants.js';
import { OfferEligibilityService } from '../src/modules/offers/offer-eligibility.service.js';
import { AssembledCustomerProfile } from '../src/modules/customers/customer-profile.service.js';
import { ISegmentationResult } from '../src/modules/segmentation/segmentation.types.js';

describe('Phase 4: Campaign and Offer Management & Eligibility Engine', () => {
  let adminToken: string;
  let marketingToken: string;

  beforeAll(async () => {
    await startTestDatabase();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    const admin = await createTestUser(UserRole.ADMIN, 'admin@example.com');
    adminToken = admin.accessToken;

    const marketing = await createTestUser(UserRole.MARKETING_MANAGER, 'marketing@example.com');
    marketingToken = marketing.accessToken;
  });

  describe('Campaign Management CRUD & Validation', () => {
    it('creates a new campaign with valid fields and date ranges', async () => {
      const payload = {
        campaignCode: 'CAMP-VIP-2026',
        name: 'VIP Customer Retention',
        description: 'Exclusive rewards for high-value customers',
        objective: CampaignObjective.LOYALTY_REWARD,
        targetSegments: [CustomerSegmentType.LOYALTY_CANDIDATE],
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-12-31T23:59:59.000Z',
        allowedChannels: ['EMAIL', 'SMS'],
        priority: 1,
        toneGuideline: 'CELEBRATORY_INCENTIVIZING'
      };

      const res = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${marketingToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.campaignCode).toBe('CAMP-VIP-2026');
      expect(res.body.data.status).toBe(CampaignStatus.DRAFT);
    });

    it('rejects campaign creation when endDate is before startDate', async () => {
      const payload = {
        campaignCode: 'CAMP-INVALID-DATES',
        name: 'Invalid Date Range Campaign',
        description: 'Should fail validation',
        objective: CampaignObjective.CUSTOMER_ENGAGEMENT,
        targetSegments: [CustomerSegmentType.CONSISTENT_CUSTOMER],
        startDate: '2026-12-31T00:00:00.000Z',
        endDate: '2026-01-01T00:00:00.000Z'
      };

      const res = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${marketingToken}`)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('updates campaign status and attaches/detaches offers', async () => {
      const offer = await OfferModel.create({
        offerCode: 'OFFER-TEST-10',
        name: '$10 Discount',
        description: 'Test discount',
        offerType: OfferType.FIXED_DISCOUNT,
        value: 10,
        valueType: OfferValueType.FIXED_AMOUNT,
        targetSegments: [CustomerSegmentType.CONSISTENT_CUSTOMER],
        validFrom: new Date('2026-01-01'),
        validUntil: new Date('2026-12-31'),
        status: OfferStatus.ACTIVE
      });

      const campaign = await CampaignModel.create({
        campaignCode: 'CAMP-TEST-ATTACH',
        name: 'Attach Test',
        description: 'Test campaign for offers',
        objective: CampaignObjective.CUSTOMER_ENGAGEMENT,
        targetSegments: [CustomerSegmentType.CONSISTENT_CUSTOMER],
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        status: CampaignStatus.DRAFT
      });

      // Update status to ACTIVE
      const statusRes = await request(app)
        .patch(`/api/v1/campaigns/${campaign._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: CampaignStatus.ACTIVE });

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data.status).toBe(CampaignStatus.ACTIVE);

      // Attach offer
      const attachRes = await request(app)
        .post(`/api/v1/campaigns/${campaign._id}/offers`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ offerId: offer._id.toString() });

      expect(attachRes.status).toBe(200);
      expect(attachRes.body.data.offerIds.length).toBe(1);

      // Detach offer
      const detachRes = await request(app)
        .delete(`/api/v1/campaigns/${campaign._id}/offers/${offer._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(detachRes.status).toBe(200);
      expect(detachRes.body.data.offerIds.length).toBe(0);
    });
  });

  describe('Deterministic Offer Eligibility Evaluation', () => {
    const mockProfile: AssembledCustomerProfile = {
      customer: {
        id: 'cust-123',
        customerId: 'CUST-001',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        customerType: 'INDIVIDUAL',
        accountStatus: 'ACTIVE',
        loyaltyTier: 'GOLD',
        loyaltyPoints: 650,
        membershipStartDate: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000), // 200 days ago
        createdAt: new Date()
      },
      subscription: {
        activePlan: 'PREMIUM_UNLIMITED',
        planType: 'TELECOM',
        planStatus: 'ACTIVE',
        planStartDate: new Date('2025-01-01')
      },
      activity: {
        lastActivityDate: new Date(),
        activityCount30d: 25,
        activityCountPrevious30d: 20,
        activityTrend: 'INCREASING'
      },
      billing: {
        totalInvoiced: 1200,
        outstandingAmount: 0,
        currency: 'USD',
        paymentStatus: 'PAID',
        overdueInvoicesCount: 0,
        hasDisputedInvoices: false
      },
      communicationPreferences: {
        emailConsent: true,
        smsConsent: true,
        whatsappConsent: false,
        preferredChannel: 'EMAIL',
        optedOut: false,
        consentUpdatedAt: new Date()
      }
    };

    const mockClassification: ISegmentationResult = {
      customerId: 'CUST-001',
      primarySegment: CustomerSegmentType.LOYALTY_CANDIDATE,
      segments: [CustomerSegmentType.LOYALTY_CANDIDATE],
      classificationStatus: ClassificationStatus.CLASSIFIED,
      confidence: 0.95,
      reasonCodes: ['HIGH_LOYALTY_POINTS'],
      explanations: ['Customer has high loyalty score and tenure'],
      evidence: {
        daysSinceLastActivity: 1,
        activityCount30d: 25,
        activityCountPrevious30d: 20,
        activityRatio: 1.25,
        loyaltyPoints: 650,
        tenureDays: 200,
        overdueAmount: 0,
        maxDaysOverdue: 0,
        overdueInvoiceCount: 0,
        accountStatus: 'ACTIVE',
        planStatus: 'ACTIVE'
      },
      ruleVersion: '1.0.0',
      evaluatedAt: new Date()
    };

    it('evaluates customer as ELIGIBLE when all policy conditions are satisfied', async () => {
      const offer = await OfferModel.create({
        offerCode: 'OFFER-VIP-DOUBLE',
        name: 'VIP Double Points',
        description: 'Earn 2x points on renewals',
        offerType: OfferType.LOYALTY_POINTS,
        value: 2,
        valueType: OfferValueType.POINTS,
        targetSegments: [CustomerSegmentType.LOYALTY_CANDIDATE],
        eligibilityRules: {
          minimumLoyaltyPoints: 500,
          minimumMembershipDays: 180,
          requiredLoyaltyTiers: ['GOLD', 'PLATINUM'],
          requiredAccountStatus: 'ACTIVE',
          requiredPlanStatus: 'ACTIVE',
          maxOverdueBalance: 0
        },
        validFrom: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        allowedChannels: ['EMAIL', 'SMS'],
        status: OfferStatus.ACTIVE,
        maxRedemptions: 500,
        currentRedemptions: 10
      });

      const result = OfferEligibilityService.evaluate(
        offer,
        mockProfile,
        mockClassification,
        'EMAIL'
      );

      expect(result.eligible).toBe(true);
      expect(result.status).toBe('ELIGIBLE');
      expect(result.failedConditions.length).toBe(0);
      expect(result.passedConditions.length).toBeGreaterThan(0);
    });

    it('fails eligibility if offer is EXPIRED or outside validity date range', async () => {
      const expiredOffer = await OfferModel.create({
        offerCode: 'OFFER-EXPIRED-TEST',
        name: 'Expired Promo',
        description: 'Past promo',
        offerType: OfferType.PERCENTAGE_DISCOUNT,
        value: 15,
        valueType: OfferValueType.PERCENTAGE,
        targetSegments: [CustomerSegmentType.LOYALTY_CANDIDATE],
        validFrom: new Date('2025-01-01'),
        validUntil: new Date('2025-02-01'),
        status: OfferStatus.ACTIVE
      });

      const result = OfferEligibilityService.evaluate(
        expiredOffer,
        mockProfile,
        mockClassification,
        'EMAIL',
        new Date('2026-03-01')
      );

      expect(result.eligible).toBe(false);
      expect(result.reasonCodes).toContain('OFFER_OUTSIDE_VALIDITY_WINDOW');
    });

    it('fails eligibility if loyalty points threshold is not met', async () => {
      const highPointsOffer = await OfferModel.create({
        offerCode: 'OFFER-PLATINUM-1000',
        name: 'Platinum 1000 Points Offer',
        description: 'Requires 1000 points',
        offerType: OfferType.FIXED_DISCOUNT,
        value: 50,
        valueType: OfferValueType.FIXED_AMOUNT,
        targetSegments: [CustomerSegmentType.LOYALTY_CANDIDATE],
        eligibilityRules: {
          minimumLoyaltyPoints: 1000 // Customer only has 650
        },
        validFrom: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: OfferStatus.ACTIVE
      });

      const result = OfferEligibilityService.evaluate(
        highPointsOffer,
        mockProfile,
        mockClassification,
        'EMAIL'
      );

      expect(result.eligible).toBe(false);
      expect(result.reasonCodes).toContain('INSUFFICIENT_LOYALTY_POINTS');
      expect(result.failedConditions.some((c) => c.rule === 'minimumLoyaltyPoints')).toBe(true);
    });

    it('fails eligibility if customer segment does not intersect targetSegments', async () => {
      const inactiveOnlyOffer = await OfferModel.create({
        offerCode: 'OFFER-INACTIVE-ONLY',
        name: 'Winback Inactive',
        description: 'Only for INACTIVE segment',
        offerType: OfferType.PERCENTAGE_DISCOUNT,
        value: 40,
        valueType: OfferValueType.PERCENTAGE,
        targetSegments: [CustomerSegmentType.INACTIVE], // Customer is LOYALTY_CANDIDATE
        validFrom: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: OfferStatus.ACTIVE
      });

      const result = OfferEligibilityService.evaluate(
        inactiveOnlyOffer,
        mockProfile,
        mockClassification,
        'EMAIL'
      );

      expect(result.eligible).toBe(false);
      expect(result.reasonCodes).toContain('SEGMENT_MISMATCH');
    });

    it('fails eligibility if customer has outstanding overdue balance violating maxOverdueBalance rule', async () => {
      const overdueRestrictedOffer = await OfferModel.create({
        offerCode: 'OFFER-ZERO-DEBT',
        name: 'Zero Debt Perk',
        description: 'Requires zero overdue balance',
        offerType: OfferType.FIXED_DISCOUNT,
        value: 20,
        valueType: OfferValueType.FIXED_AMOUNT,
        targetSegments: [CustomerSegmentType.LOYALTY_CANDIDATE],
        eligibilityRules: {
          maxOverdueBalance: 0
        },
        validFrom: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: OfferStatus.ACTIVE
      });

      const profileWithOverdue: AssembledCustomerProfile = {
        ...mockProfile,
        billing: {
          ...mockProfile.billing,
          outstandingAmount: 150,
          overdueInvoicesCount: 1
        }
      };

      const result = OfferEligibilityService.evaluate(
        overdueRestrictedOffer,
        profileWithOverdue,
        mockClassification,
        'EMAIL'
      );

      expect(result.eligible).toBe(false);
      expect(result.reasonCodes).toContain('OVERDUE_BALANCE_RESTRICTION');
    });

    it('fails eligibility if customer has opted out of communication', async () => {
      const offer = await OfferModel.create({
        offerCode: 'OFFER-EMAIL-PERK',
        name: 'Email Promo',
        description: 'Sent via email',
        offerType: OfferType.FIXED_DISCOUNT,
        value: 10,
        valueType: OfferValueType.FIXED_AMOUNT,
        targetSegments: [CustomerSegmentType.LOYALTY_CANDIDATE],
        validFrom: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        allowedChannels: ['EMAIL'],
        status: OfferStatus.ACTIVE
      });

      const profileOptedOut: AssembledCustomerProfile = {
        ...mockProfile,
        communicationPreferences: {
          ...mockProfile.communicationPreferences,
          optedOut: true
        }
      };

      const result = OfferEligibilityService.evaluate(
        offer,
        profileOptedOut,
        mockClassification,
        'EMAIL'
      );

      expect(result.eligible).toBe(false);
      expect(result.reasonCodes).toContain('CUSTOMER_OPTED_OUT');
    });
  });
});

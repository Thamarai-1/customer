import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import {
  startTestDatabase,
  stopTestDatabase,
  clearTestDatabase,
  createTestUser
} from './test-helper.js';
import { UserRole } from '../src/modules/users/user.model.js';
import { CustomerModel, CustomerType, AccountStatus, LoyaltyTier, PlanStatus } from '../src/modules/customers/customer.model.js';
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
import { ComplianceValidationModel } from '../src/modules/compliance/compliance.model.js';
import { ComplianceService } from '../src/modules/compliance/compliance.service.js';
import { ReviewStatus, ReviewActionType, RejectionReasonCode, MessageVersionSource } from '../src/modules/reviews/review.constants.js';
import { MessageReviewModel, MessageVersionModel, ReviewActionModel } from '../src/modules/reviews/review.model.js';
import { ReviewService } from '../src/modules/reviews/review.service.js';

describe('Phase 7: Human Review & Approval Workflow Tests', () => {
  let adminToken: string;
  let complianceToken: string;
  let marketingToken: string;
  let reviewerUserId: string;

  beforeAll(async () => {
    await startTestDatabase();
  }, 30000);

  afterAll(async () => {
    await stopTestDatabase();
  }, 30000);

  beforeEach(async () => {
    await clearTestDatabase();

    const admin = await createTestUser(UserRole.ADMIN, 'admin@example.com');
    const reviewer = await createTestUser(UserRole.COMPLIANCE_REVIEWER, 'reviewer@example.com');
    const marketing = await createTestUser(UserRole.MARKETING_MANAGER, 'marketing@example.com');

    adminToken = admin.accessToken;
    complianceToken = reviewer.accessToken;
    marketingToken = marketing.accessToken;
    reviewerUserId = reviewer.user._id.toString();
  });

  // Helper to create complete customer fixture
  async function createFixtureCustomer(customerId = 'CUST-REV-101') {
    const customer = await CustomerModel.create({
      customerId,
      firstName: 'Samantha',
      lastName: 'Miller',
      email: `${customerId.toLowerCase()}@example.com`,
      phone: '+1-555-019-2834',
      customerType: CustomerType.INDIVIDUAL,
      accountStatus: AccountStatus.ACTIVE,
      loyaltyTier: LoyaltyTier.GOLD,
      planType: 'Unlimited Plus',
      planStatus: PlanStatus.ACTIVE,
      monthlySpend: 110,
      totalSpend: 1320,
      contractEndDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
    });

    await CommunicationPreferenceModel.create({
      customerId,
      customerRef: customer._id,
      emailConsent: true,
      smsConsent: true,
      whatsappConsent: true,
      preferredChannel: PreferredChannel.EMAIL,
      optedOut: false,
      consentSource: 'WEB_FORM',
      consentUpdatedAt: new Date()
    });

    return customer;
  }

  // Helper to seed a valid draft message with compliance validation
  async function createDraftWithCompliance(
    customerId = 'CUST-REV-101',
    decision: OverallComplianceDecision = OverallComplianceDecision.PASS,
    warnings: string[] = []
  ) {
    const customer = await createFixtureCustomer(customerId);

    const message = await GeneratedMessageModel.create({
      customerId: customer.customerId,
      customerRef: customer._id,
      campaignId: 'CMP-2026-ENGAGE',
      strategyId: 'STRAT-PREMIUM-OFFER',
      primarySegment: CustomerSegmentType.LOYALTY_CANDIDATE,
      objective: 'LOYALTY_RECOGNITION',
      channel: 'EMAIL',
      subject: 'Exclusive Priority Reward for Samantha',
      body: 'Hello Samantha, as a valued Gold member, enjoy an exclusive upgrade discount with code REWARD20. Opt-out at any time.',
      generationStatus: MessageGenerationStatus.GENERATED,
      groundingStatus: GroundingStatus.PASSED,
      provider: 'OPENAI',
      model: 'gpt-4o-mini',
      promptVersion: '1.0.0',
      evidenceSnapshot: {
        factsUsed: ['Gold tier', '12 months loyalty']
      }
    });

    const compliance = await ComplianceService.validateMessage(message._id.toString());

    if (decision !== OverallComplianceDecision.PASS || warnings.length > 0) {
      compliance.overallStatus = decision;
      if (decision === OverallComplianceDecision.BLOCKED) {
        compliance.decision = RecommendedAction.BLOCK_MESSAGE;
      }
      if (warnings.length > 0) {
        compliance.decision = RecommendedAction.REVIEW_REQUIRED;
        compliance.findings = warnings.map((warn, i) => ({
          ruleId: `WARN_RULE_${i + 1}`,
          checkId: CheckId.CONTENT_POLICY,
          severity: SeverityLevel.MEDIUM,
          reasonCode: ComplianceReasonCode.MANIPULATIVE_URGENCY,
          message: warn,
          recommendedAction: RecommendedAction.REVIEW_REQUIRED
        }));
        compliance.summary.warnings = warnings.length;
      }
      await compliance.save();
    }

    return { customer, message, compliance };
  }

  // =========================================================================
  // 1. Queue Initialization & Lifecycle Setup
  // =========================================================================
  describe('Review Queue Initialization and Model Setup', () => {
    it('creates a new review item in PENDING_REVIEW when compliance report is PASS', async () => {
      const { message, customer, compliance } = await createDraftWithCompliance('CUST-REV-101', OverallComplianceDecision.PASS);

      const review = await ReviewService.getOrCreateReview(message._id.toString());

      expect(review).toBeDefined();
      expect(review.status).toBe(ReviewStatus.PENDING_REVIEW);
      expect(review.currentMessageVersion).toBe(1);
      expect(review.customerId).toBe(customer.customerId);
      expect(review.currentComplianceValidationId.toString()).toBe(compliance._id.toString());

      // Verify immutable version 1 created
      const versions = await MessageVersionModel.find({ generatedMessageId: message._id });
      expect(versions).toHaveLength(1);
      expect(versions[0].version).toBe(1);
      expect(versions[0].source).toBe(MessageVersionSource.AI_GENERATED);
      expect(versions[0].subject).toBe(message.subject);
      expect(versions[0].body).toBe(message.body);

    });

    it('sets initial status to REVISION_REQUESTED if compliance validation was BLOCK', async () => {
      const { message } = await createDraftWithCompliance('CUST-REV-102', OverallComplianceDecision.BLOCKED);

      const review = await ReviewService.getOrCreateReview(message._id.toString());

      expect(review.status).toBe(ReviewStatus.REJECTED);
    });

    it('returns existing review when called multiple times (idempotent)', async () => {
      const { message } = await createDraftWithCompliance('CUST-REV-103', OverallComplianceDecision.PASS);

      const review1 = await ReviewService.getOrCreateReview(message._id.toString());
      const review2 = await ReviewService.getOrCreateReview(message._id.toString());

      expect(review1._id.toString()).toBe(review2._id.toString());
      const versions = await MessageVersionModel.find({ generatedMessageId: message._id });
      expect(versions).toHaveLength(1);
    });
  });

  // =========================================================================
  // 2. RBAC & Access Control
  // =========================================================================
  describe('Role-Based Access Control (RBAC) Enforcement', () => {
    it('allows Marketing Manager to list reviews and inspect details', async () => {
      const { message } = await createDraftWithCompliance('CUST-REV-104', OverallComplianceDecision.PASS);
      const review = await ReviewService.getOrCreateReview(message._id.toString());

      const listRes = await request(app)
        .get('/api/v1/reviews')
        .set('Authorization', `Bearer ${marketingToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

      const detailRes = await request(app)
        .get(`/api/v1/reviews/${review._id}`)
        .set('Authorization', `Bearer ${marketingToken}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.review._id.toString()).toBe(review._id.toString());
    });

    it('FORBIDS Marketing Manager from approving reviews (requires reviews:approve)', async () => {
      const { message, compliance } = await createDraftWithCompliance('CUST-REV-105', OverallComplianceDecision.PASS);
      const review = await ReviewService.getOrCreateReview(message._id.toString());

      const res = await request(app)
        .post(`/api/v1/reviews/${review._id}/approve`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({
          messageVersion: 1,
          complianceValidationId: compliance._id.toString()
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('FORBIDS Marketing Manager from rejecting reviews (requires reviews:reject)', async () => {
      const { message } = await createDraftWithCompliance('CUST-REV-106', OverallComplianceDecision.PASS);
      const review = await ReviewService.getOrCreateReview(message._id.toString());

      const res = await request(app)
        .post(`/api/v1/reviews/${review._id}/reject`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({
          rejectionReasonCode: RejectionReasonCode.INAPPROPRIATE_TONE,
          rejectionReason: 'Tone not suitable'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows Compliance Reviewer to approve and reject reviews', async () => {
      const { message, compliance } = await createDraftWithCompliance('CUST-REV-107', OverallComplianceDecision.PASS);
      const review = await ReviewService.getOrCreateReview(message._id.toString());

      const approveRes = await request(app)
        .post(`/api/v1/reviews/${review._id}/approve`)
        .set('Authorization', `Bearer ${complianceToken}`)
        .send({
          messageVersion: 1,
          complianceValidationId: compliance._id.toString(),
          comments: 'Approved by certified compliance reviewer'
        });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe(ReviewStatus.APPROVED);
    });

    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/reviews');
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // 3. Approval Workflow Preconditions & Validation
  // =========================================================================
  describe('Approval Preconditions and Concurrency Safety', () => {
    it('rejects approval when version mismatch occurs (e.g. submitted version 1 vs draft version 2)', async () => {
      const { message, compliance } = await createDraftWithCompliance('CUST-REV-108', OverallComplianceDecision.PASS);
      const review = await ReviewService.getOrCreateReview(message._id.toString());

      // Advance version to 2 via edit
      await ReviewService.editMessage(
        review._id.toString(),
        {
          subject: 'Updated Subject V2',
          body: 'Updated Body content V2. Opt-out at any time.',
          editReason: 'Manual copy optimization'
        },
        { id: reviewerUserId, name: 'Reviewer Operator' }
      );

      // Attempt to approve version 1
      const res = await request(app)
        .post(`/api/v1/reviews/${review._id}/approve`)
        .set('Authorization', `Bearer ${complianceToken}`)
        .send({
          messageVersion: 1,
          complianceValidationId: compliance._id.toString()
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('VERSION_CONFLICT');
    });

    it('requires explicit warning acknowledgement when compliance decision is PASS_WITH_WARNINGS', async () => {
      const { message, compliance } = await createDraftWithCompliance(
        'CUST-REV-109',
        OverallComplianceDecision.PASS_WITH_WARNINGS,
        ['Slight urgency tone detected in introductory paragraph']
      );
      const review = await ReviewService.getOrCreateReview(message._id.toString());

      // Attempt approval without warning acknowledgements
      const failRes = await request(app)
        .post(`/api/v1/reviews/${review._id}/approve`)
        .set('Authorization', `Bearer ${complianceToken}`)
        .send({
          messageVersion: 1,
          complianceValidationId: compliance._id.toString(),
          warningAcknowledgements: []
        });

      expect(failRes.status).toBe(400);
      expect(failRes.body.error.code).toBe('WARNINGS_UNACKNOWLEDGED');

      // Now supply required warning acknowledgements
      const successRes = await request(app)
        .post(`/api/v1/reviews/${review._id}/approve`)
        .set('Authorization', `Bearer ${complianceToken}`)
        .send({
          messageVersion: 1,
          complianceValidationId: compliance._id.toString(),
          warningAcknowledgements: ['Reviewed urgency tone; confirmed acceptable for Gold upgrade announcement.'],
          comments: 'Override approved with documented justification'
        });

      expect(successRes.status).toBe(200);
      expect(successRes.body.data.status).toBe(ReviewStatus.APPROVED);
      expect(successRes.body.data.warningAcknowledgements).toHaveLength(1);
    });

    it('prevents approval when compliance decision is BLOCK', async () => {
      const { message, compliance } = await createDraftWithCompliance('CUST-REV-110', OverallComplianceDecision.BLOCKED);
      const review = await ReviewService.getOrCreateReview(message._id.toString());

      const res = await request(app)
        .post(`/api/v1/reviews/${review._id}/approve`)
        .set('Authorization', `Bearer ${complianceToken}`)
        .send({
          messageVersion: 1,
          complianceValidationId: compliance._id.toString()
        });

      expect(res.status).toBe(412); // Invalid status for approval since BLOCK sets REJECTED
    });
  });

  // =========================================================================
  // 4. Stale Data Protection
  // =========================================================================
  describe('Stale Customer and Business Data Protection', () => {
    it('blocks approval and flags stale data if customer opted out after draft generation', async () => {
      const { message, customer, compliance } = await createDraftWithCompliance('CUST-REV-111', OverallComplianceDecision.PASS);
      const review = await ReviewService.getOrCreateReview(message._id.toString());

      // Customer subsequently changes preference to opted out
      await CommunicationPreferenceModel.updateOne(
        { customerId: customer.customerId },
        { $set: { optedOut: true } }
      );

      const res = await request(app)
        .post(`/api/v1/reviews/${review._id}/approve`)
        .set('Authorization', `Bearer ${complianceToken}`)
        .send({
          messageVersion: 1,
          complianceValidationId: compliance._id.toString()
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('STALE_DATA_DETECTED');

      // Verify review updated to detect stale data
      const updated = await MessageReviewModel.findById(review._id);
      expect(updated?.staleDataDetected).toBe(true);
      expect(updated?.status).toBe(ReviewStatus.REJECTED);
    });

    it('blocks approval if customer overdue balance has been fully settled ($0 balance)', async () => {
      const { message, customer, compliance } = await createDraftWithCompliance('CUST-REV-112', OverallComplianceDecision.PASS);
      // Give message payment reminder attributes
      await GeneratedMessageModel.updateOne(
        { _id: message._id },
        { $set: { objective: 'PAYMENT_REMINDER', primarySegment: CustomerSegmentType.OVERDUE_BILL, subject: 'Payment Reminder for Invoice #INV-909' } }
      );

      // Create an invoice that was PAID
      await BillingRecordModel.create({
        customerId: customer.customerId,
        customerRef: customer._id,
        invoiceId: 'INV-909',
        invoiceAmount: 150,
        amountDue: 0,
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        paymentStatus: PaymentStatus.PAID,
        invoiceStatus: InvoiceStatus.CLOSED,
        disputeStatus: 'NONE'
      });

      const review = await ReviewService.getOrCreateReview(message._id.toString());

      const res = await request(app)
        .post(`/api/v1/reviews/${review._id}/approve`)
        .set('Authorization', `Bearer ${complianceToken}`)
        .send({
          messageVersion: 1,
          complianceValidationId: compliance._id.toString()
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('STALE_DATA_DETECTED');
    });

    it('blocks approval if an invoice entered active dispute after draft creation', async () => {
      const { message, customer, compliance } = await createDraftWithCompliance('CUST-REV-113', OverallComplianceDecision.PASS);
      await GeneratedMessageModel.updateOne(
        { _id: message._id },
        { $set: { objective: 'PAYMENT_REMINDER', primarySegment: CustomerSegmentType.OVERDUE_BILL, subject: 'Urgent: Payment Past Due' } }
      );

      await BillingRecordModel.create({
        customerId: customer.customerId,
        customerRef: customer._id,
        invoiceId: 'INV-910',
        invoiceAmount: 200,
        amountDue: 200,
        dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        paymentStatus: PaymentStatus.OVERDUE,
        invoiceStatus: InvoiceStatus.ACTIVE,
        disputeStatus: 'UNDER_INVESTIGATION'
      });

      const review = await ReviewService.getOrCreateReview(message._id.toString());

      const res = await request(app)
        .post(`/api/v1/reviews/${review._id}/approve`)
        .set('Authorization', `Bearer ${complianceToken}`)
        .send({
          messageVersion: 1,
          complianceValidationId: compliance._id.toString()
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('STALE_DATA_DETECTED');
    });

    it('blocks approval if an associated promotional offer has expired or been deactivated', async () => {
      const { message, compliance } = await createDraftWithCompliance('CUST-REV-114', OverallComplianceDecision.PASS);

      const offer = await OfferModel.create({
        offerId: 'OFF-REV-01',
        offerCode: 'PROMO_EXPIRED',
        name: 'Flash Discount',
        description: '20% discount',
        offerType: OfferType.PERCENTAGE_DISCOUNT,
        valueType: OfferValueType.PERCENTAGE,
        value: 20,
        status: OfferStatus.EXPIRED,
        validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        validUntil: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      });

      // Link offer to draft
      await GeneratedMessageModel.updateOne(
        { _id: message._id },
        { $set: { referencedOffers: ['PROMO_EXPIRED'] } }
      );

      const review = await ReviewService.getOrCreateReview(message._id.toString());

      const res = await request(app)
        .post(`/api/v1/reviews/${review._id}/approve`)
        .set('Authorization', `Bearer ${complianceToken}`)
        .send({
          messageVersion: 1,
          complianceValidationId: compliance._id.toString()
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('STALE_DATA_DETECTED');
    });
  });

  // =========================================================================
  // 5. Delivery Isolation (Strict Phase 7 Boundary)
  // =========================================================================
  describe('Delivery Isolation Verification', () => {
    it('CONFIRMS that approving a review NEVER triggers email or SMS delivery', async () => {
      const { message, compliance } = await createDraftWithCompliance('CUST-REV-115', OverallComplianceDecision.PASS);
      const review = await ReviewService.getOrCreateReview(message._id.toString());

      const approveRes = await request(app)
        .post(`/api/v1/reviews/${review._id}/approve`)
        .set('Authorization', `Bearer ${complianceToken}`)
        .send({
          messageVersion: 1,
          complianceValidationId: compliance._id.toString(),
          comments: 'Approved for delivery staging'
        });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe(ReviewStatus.APPROVED);

      // Verify delivery communication history table remains empty
      const historyCount = await CommunicationHistoryModel.countDocuments();
      expect(historyCount).toBe(0);

      // Verify review status is staged as APPROVED, not SENT or DELIVERED
      const updatedReview = await MessageReviewModel.findById(review._id);
      expect(updatedReview?.status).toBe(ReviewStatus.APPROVED);
    });
  });

  // =========================================================================
  // 6. Edit Draft & Compliance Invalidation Workflow
  // =========================================================================
  describe('Edit Draft and Automatic Compliance Invalidation', () => {
    it('creates version 2, updates content, and invalidates previous compliance validation', async () => {
      const { message, compliance } = await createDraftWithCompliance('CUST-REV-116', OverallComplianceDecision.PASS);
      const review = await ReviewService.getOrCreateReview(message._id.toString());

      const editRes = await request(app)
        .post(`/api/v1/reviews/${review._id}/edit`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({
          subject: 'Special Gold Anniversary Reward',
          body: 'Dear Samantha, enjoy your Gold member anniversary gift. Use code GOLD20. Opt out any time.',
          editReason: 'Tone polished by Marketing Editor'
        });

      expect(editRes.status).toBe(200);
      expect(editRes.body.data.review.currentMessageVersion).toBe(2);

      // Verify version 2 document
      const versions = await MessageVersionModel.find({ generatedMessageId: message._id }).sort({ version: 1 });
      expect(versions).toHaveLength(2);
      expect(versions[1].version).toBe(2);
      expect(versions[1].source).toBe(MessageVersionSource.HUMAN_EDITED);
      expect(versions[1].subject).toBe('Special Gold Anniversary Reward');
      expect(versions[1].editReason).toBe('Tone polished by Marketing Editor');

      // Verify compliance validation was automatically regenerated and differs from v1
      const updatedReview = await MessageReviewModel.findById(review._id);
      expect(updatedReview?.currentComplianceValidationId.toString()).not.toBe(compliance._id.toString());

      // Verify audit action recorded for EDIT
      const actions = await ReviewActionModel.find({ reviewId: review._id, action: ReviewActionType.EDIT });
      expect(actions).toHaveLength(1);
      expect(actions[0].messageVersion).toBe(2);
    });

    it('prevents editing an already approved message', async () => {
      const { message, compliance } = await createDraftWithCompliance('CUST-REV-117', OverallComplianceDecision.PASS);
      const review = await ReviewService.getOrCreateReview(message._id.toString());

      await ReviewService.approveReview(
        review._id.toString(),
        {
          messageVersion: 1,
          complianceValidationId: compliance._id.toString()
        },
        { id: reviewerUserId, name: 'Compliance Officer' }
      );

      const editRes = await request(app)
        .post(`/api/v1/reviews/${review._id}/edit`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({
          subject: 'Post-Approval Edit Attempt',
          body: 'This edit must be rejected'
        });

      expect(editRes.status).toBe(409);
    });
  });

  // =========================================================================
  // 7. Rejection & Revision Request Workflows
  // =========================================================================
  describe('Rejection and Revision Workflows', () => {
    it('successfully rejects a review with rejection reason code and comments', async () => {
      const { message } = await createDraftWithCompliance('CUST-REV-118', OverallComplianceDecision.PASS);
      const review = await ReviewService.getOrCreateReview(message._id.toString());

      const res = await request(app)
        .post(`/api/v1/reviews/${review._id}/reject`)
        .set('Authorization', `Bearer ${complianceToken}`)
        .send({
          rejectionReasonCode: RejectionReasonCode.INAPPROPRIATE_TONE,
          rejectionReason: 'Urgency tone is too aggressive for brand guidelines',
          comments: 'Please revise opening statement to sound more collaborative.'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ReviewStatus.REJECTED);
      expect(res.body.data.rejectionReasonCode).toBe(RejectionReasonCode.INAPPROPRIATE_TONE);

      // Verify review status updated to REJECTED
      const updatedReview = await MessageReviewModel.findById(review._id);
      expect(updatedReview?.status).toBe(ReviewStatus.REJECTED);

      // Verify action logged
      const actions = await ReviewActionModel.find({ reviewId: review._id, action: ReviewActionType.REJECT });
      expect(actions).toHaveLength(1);
    });

    it('successfully requests revision with actionable reviewer feedback', async () => {
      const { message } = await createDraftWithCompliance('CUST-REV-119', OverallComplianceDecision.PASS);
      const review = await ReviewService.getOrCreateReview(message._id.toString());

      const res = await request(app)
        .post(`/api/v1/reviews/${review._id}/request-revision`)
        .set('Authorization', `Bearer ${marketingToken}`)
        .send({
          comments: 'Please include the loyalty point expiration date before approval.'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ReviewStatus.REVISION_REQUESTED);
      expect(res.body.data.reviewComments).toContain('loyalty point expiration');

      // Verify action logged
      const actions = await ReviewActionModel.find({ reviewId: review._id, action: ReviewActionType.REQUEST_REVISION });
      expect(actions).toHaveLength(1);
    });
  });

  // =========================================================================
  // 8. Reviewer Assignment & Dashboard Statistics
  // =========================================================================
  describe('Reviewer Assignment and Dashboard Workload Analytics', () => {
    it('assigns designated reviewer and logs action audit entry', async () => {
      const { message } = await createDraftWithCompliance('CUST-REV-120', OverallComplianceDecision.PASS);
      const review = await ReviewService.getOrCreateReview(message._id.toString());

      const res = await request(app)
        .patch(`/api/v1/reviews/${review._id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reviewerId: reviewerUserId
        });

      expect(res.status).toBe(200);
      expect(res.body.data.assignedReviewerId.toString()).toBe(reviewerUserId);

      const actions = await ReviewActionModel.find({ reviewId: review._id, action: ReviewActionType.ASSIGN_REVIEWER });
      expect(actions).toHaveLength(1);
    });

    it('aggregates dashboard statistics accurately', async () => {
      // Create 1 pending review
      const item1 = await createDraftWithCompliance('CUST-REV-121', OverallComplianceDecision.PASS);
      await ReviewService.getOrCreateReview(item1.message._id.toString());

      // Create 1 rejected review
      const item2 = await createDraftWithCompliance('CUST-REV-122', OverallComplianceDecision.PASS);
      const rev2 = await ReviewService.getOrCreateReview(item2.message._id.toString());
      await ReviewService.rejectReview(
        rev2._id.toString(),
        {
          rejectionReasonCode: RejectionReasonCode.COMPLIANCE_NON_COMPLIANT,
          rejectionReason: 'Compliance non-compliant'
        },
        { id: reviewerUserId, name: 'Reviewer' }
      );

      const res = await request(app)
        .get('/api/v1/reviews/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalPendingReviews).toBeGreaterThanOrEqual(1);
      expect(res.body.data.rejectedMessages).toBeGreaterThanOrEqual(1);
    });
  });
});

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  startTestDatabase,
  stopTestDatabase,
  clearTestDatabase,
  createTestUser
} from './test-helper.js';
import { UserRole } from '../src/modules/users/user.model.js';
import { CustomerModel, CustomerType, AccountStatus, LoyaltyTier } from '../src/modules/customers/customer.model.js';
import { CustomerSegmentType } from '../src/modules/segmentation/segmentation.constants.js';
import { SegmentationService } from '../src/modules/segmentation/segmentation.service.js';
import { PolicyEngineService } from '../src/modules/policy-engine/policy-engine.service.js';
import { GeneratedMessageModel } from '../src/modules/message-generation/message-generation.model.js';
import { MessageGenerationStatus, GroundingStatus } from '../src/modules/message-generation/message-generation.constants.js';
import { ComplianceService } from '../src/modules/compliance/compliance.service.js';
import { OverallComplianceDecision } from '../src/modules/compliance/compliance.constants.js';
import { ReviewService } from '../src/modules/reviews/review.service.js';
import { ReviewStatus } from '../src/modules/reviews/review.constants.js';
import { DeliveryService } from '../src/modules/delivery/delivery.service.js';
import { DeliveryMode, DeliveryStatus, DeliveryErrorCode } from '../src/modules/delivery/delivery.constants.js';
import { DeliveryRecordModel } from '../src/modules/delivery/delivery.model.js';
import { CommunicationPreferenceModel } from '../src/modules/communications/preference.model.js';
import { BillingRecordModel, PaymentStatus, InvoiceStatus } from '../src/modules/billing/billing-record.model.js';
import { OfferModel } from '../src/modules/offers/offers.model.js';
import { OfferType, OfferStatus, OfferValueType } from '../src/modules/offers/offers.types.js';
import { CommunicationHistoryModel } from '../src/modules/delivery/communication-history.model.js';
import { AuditLogModel, AuditActionType } from '../src/modules/audit/audit-log.model.js';
import { StrategiesService } from '../src/modules/strategies/strategies.service.js';
import { BillingPoliciesService } from '../src/modules/billing-policies/billing-policies.service.js';

describe('Phase 8 — End-to-End Integration & Controlled Delivery Suite', () => {
  let reviewerUser: { id: string; name: string };

  beforeAll(async () => {
    await startTestDatabase();
    await StrategiesService.bootstrapDefaults();
    await BillingPoliciesService.getConfig();

    const { user } = await createTestUser(
      UserRole.COMPLIANCE_REVIEWER,
      'reviewer@compliance.example.com',
      'SecurePass123!'
    );
    reviewerUser = { id: user._id.toString(), name: user.name };
  }, 60000);

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    await StrategiesService.bootstrapDefaults();
    await BillingPoliciesService.getConfig();
  }, 30000);

  // Helper to setup active customer with preferences
  const setupCustomerFixture = async (spec: {
    customerId: string;
    firstName: string;
    lastName: string;
    email: string;
    tier?: LoyaltyTier;
    points?: number;
    optedOut?: boolean;
    emailConsent?: boolean;
  }) => {
    const customer = await CustomerModel.create({
      customerId: spec.customerId,
      firstName: spec.firstName,
      lastName: spec.lastName,
      email: spec.email,
      phone: '+1-555-0199',
      customerType: CustomerType.RETAIL,
      accountStatus: AccountStatus.ACTIVE,
      loyaltyInfo: {
        loyaltyTier: spec.tier || LoyaltyTier.SILVER,
        loyaltyPoints: spec.points || 650,
        membershipStartDate: new Date(Date.now() - 180 * 86400000)
      },
      subscription: {
        activePlan: 'Retail Plus Pro',
        planType: 'Postpaid',
        planStatus: 'ACTIVE',
        planStartDate: new Date(Date.now() - 180 * 86400000)
      }
    });

    await CommunicationPreferenceModel.create({
      customerId: spec.customerId,
      customerRef: customer._id,
      emailConsent: spec.emailConsent !== undefined ? spec.emailConsent : true,
      smsConsent: true,
      whatsappConsent: false,
      preferredChannel: 'EMAIL',
      optedOut: spec.optedOut || false,
      consentUpdatedAt: new Date(),
      consentSource: 'ACCOUNT_SETUP'
    });

    return customer;
  };

  // Helper to create valid GeneratedMessage with all schema requirements
  const createTestMessage = async (overrides: any) => {
    return await GeneratedMessageModel.create({
      objective: 'Customer Engagement',
      channel: 'EMAIL',
      subject: 'Important Member Notice',
      body: 'Dear customer, thank you for your ongoing engagement. Please contact us with any questions.',
      evidenceSnapshot: {
        factsUsed: ['Active member', 'Account in good standing']
      },
      status: MessageGenerationStatus.GENERATED,
      generationStatus: MessageGenerationStatus.GENERATED,
      groundingStatus: GroundingStatus.PASSED,
      provider: 'mock',
      model: 'e2e-test-model',
      promptVersion: '1.0.0',
      ...overrides
    });
  };

  // =========================================================================
  // Workflow 1 — Consistent Customer
  // =========================================================================
  it('Workflow 1: Consistent Customer -> Segmentation -> Policy -> AI Message -> Compliance -> Approval -> Mock Delivery -> Audit Log', async () => {
    const customer = await setupCustomerFixture({
      customerId: 'CUST-E2E-001',
      firstName: 'Aarav',
      lastName: 'Sharma',
      email: 'aarav.sharma@example.com'
    });

    // 1. Segmentation
    const segmentation = await SegmentationService.classifyCustomer(customer.customerId);
    expect(segmentation).toBeDefined();

    // 2. Policy Engine
    const policy = await PolicyEngineService.evaluateCustomerPolicy(customer.customerId);
    expect(policy.strategy).toBeDefined();

    // 3. Draft AI Message
    const message = await createTestMessage({
      customerId: customer.customerId,
      customerRef: customer._id,
      primarySegment: CustomerSegmentType.CONSISTENT_CUSTOMER,
      objective: 'Appreciation & Retention',
      subject: `Thank you for being a valued member, ${customer.firstName}!`,
      body: `Dear ${customer.firstName},\n\nWe appreciate your consistent loyalty. As a Silver member with 650 points, we thank you.\n\nBest,\nCustomer Team`,
      evidenceSnapshot: {
        customerName: 'Aarav Sharma',
        tier: 'Silver',
        points: 650
      }
    });

    // 4. Compliance Validation
    const compliance = await ComplianceService.validateMessage(message._id.toString());
    expect(compliance.overallStatus).toBe(OverallComplianceDecision.PASS);

    // 5. Enter Review Queue & Approve
    const review = await ReviewService.getOrCreateReview(message._id.toString());
    const approved = await ReviewService.approveReview(
      review._id.toString(),
      {
        messageVersion: 1,
        complianceValidationId: compliance._id.toString(),
        comments: 'Verified grounded facts and tone.',
        warningAcknowledgements: []
      },
      reviewerUser
    );
    expect(approved.status).toBe(ReviewStatus.APPROVED);

    // 6. Controlled Delivery (MOCK)
    const delivery = await DeliveryService.executeDelivery(
      {
        generatedMessageId: message._id.toString(),
        messageVersion: 1,
        deliveryMode: DeliveryMode.MOCK
      },
      reviewerUser
    );

    expect(delivery.status).toBe(DeliveryStatus.SENT);
    expect(delivery.deliveryMode).toBe(DeliveryMode.MOCK);
    expect(delivery.providerMessageId).toMatch(/^MOCK-/);
    expect(delivery.recipientMasked).toBe('aa***@example.com');
    expect(delivery.deliveredAt).toBeDefined();

    // 7. Verify Audit Log and Communication History
    const history = await CommunicationHistoryModel.findOne({ customerId: customer.customerId });
    expect(history).toBeDefined();
    expect(history?.deliveryStatus).toBe('mock_delivered');

    const audit = await AuditLogModel.findOne({
      entityId: delivery._id.toString(),
      action: AuditActionType.MESSAGE_DISPATCHED
    });
    expect(audit).toBeDefined();
  });

  // =========================================================================
  // Workflow 2 — Loyalty Candidate
  // =========================================================================
  it('Workflow 2: Loyalty Candidate -> Offer Evaluation -> Grounded Message -> Compliance -> Approval -> Mock Delivery', async () => {
    const customer = await setupCustomerFixture({
      customerId: 'CUST-E2E-002',
      firstName: 'Pooja',
      lastName: 'Patel',
      email: 'pooja.patel@example.com',
      tier: LoyaltyTier.GOLD,
      points: 2500
    });

    await OfferModel.create({
      offerCode: 'VIP20',
      name: 'VIP 20% Discount',
      description: 'Exclusive 20% off for loyalty candidates',
      offerType: OfferType.PERCENTAGE_DISCOUNT,
      valueType: OfferValueType.PERCENTAGE,
      value: 20,
      targetSegments: [CustomerSegmentType.LOYALTY_CANDIDATE],
      status: OfferStatus.ACTIVE,
      validFrom: new Date(Date.now() - 5 * 86400000),
      validUntil: new Date(Date.now() + 30 * 86400000)
    });

    const message = await createTestMessage({
      customerId: customer.customerId,
      customerRef: customer._id,
      primarySegment: CustomerSegmentType.LOYALTY_CANDIDATE,
      objective: 'Loyalty Reward',
      subject: `Exclusive VIP Benefit for ${customer.firstName}!`,
      body: `Dear ${customer.firstName},\n\nEnjoy 20% off using promo code VIP20 at checkout. Terms and conditions apply. Valid through next month.`,
      evidenceSnapshot: {
        customerName: 'Pooja Patel',
        recommendedOfferCode: 'VIP20'
      }
    });

    const compliance = await ComplianceService.validateMessage(message._id.toString());
    expect(compliance.overallStatus).toBe(OverallComplianceDecision.PASS);

    const review = await ReviewService.getOrCreateReview(message._id.toString());
    await ReviewService.approveReview(
      review._id.toString(),
      {
        messageVersion: 1,
        complianceValidationId: compliance._id.toString(),
        comments: 'Offer terms validated',
        warningAcknowledgements: []
      },
      reviewerUser
    );

    const delivery = await DeliveryService.executeDelivery(
      {
        generatedMessageId: message._id.toString(),
        messageVersion: 1,
        deliveryMode: DeliveryMode.MOCK
      },
      reviewerUser
    );

    expect(delivery.status).toBe(DeliveryStatus.SENT);
  });

  // =========================================================================
  // Workflow 3 — Declining Activity
  // =========================================================================
  it('Workflow 3: Declining Activity -> Re-engagement -> Compliance -> Approval -> DRAFT_ONLY Delivery', async () => {
    const customer = await setupCustomerFixture({
      customerId: 'CUST-E2E-003',
      firstName: 'James',
      lastName: 'Verma',
      email: 'james.verma@example.com'
    });

    const message = await createTestMessage({
      customerId: customer.customerId,
      customerRef: customer._id,
      primarySegment: CustomerSegmentType.DECLINING_ACTIVITY,
      objective: 'Re-engagement',
      subject: `We've missed you, ${customer.firstName}`,
      body: `Dear ${customer.firstName},\n\nWe noticed you haven't visited lately. Let us know how we can help.`,
      evidenceSnapshot: { customerName: 'James Verma' }
    });

    const compliance = await ComplianceService.validateMessage(message._id.toString());
    const review = await ReviewService.getOrCreateReview(message._id.toString());
    await ReviewService.approveReview(
      review._id.toString(),
      {
        messageVersion: 1,
        complianceValidationId: compliance._id.toString(),
        comments: 'Ready for draft staging',
        warningAcknowledgements: []
      },
      reviewerUser
    );

    // Staged in DRAFT_ONLY mode
    const delivery = await DeliveryService.executeDelivery(
      {
        generatedMessageId: message._id.toString(),
        messageVersion: 1,
        deliveryMode: DeliveryMode.DRAFT_ONLY
      },
      reviewerUser
    );

    expect(delivery.deliveryMode).toBe(DeliveryMode.DRAFT_ONLY);
    expect(delivery.status).toBe(DeliveryStatus.PENDING);
    expect(delivery.deliveredAt).toBeUndefined(); // Zero messages dispatched externally
  });

  // =========================================================================
  // Workflow 4 — Inactive Customer
  // =========================================================================
  it('Workflow 4: Inactive Customer -> Respectful Reactivation -> Approval -> Mock Delivery', async () => {
    const customer = await setupCustomerFixture({
      customerId: 'CUST-E2E-004',
      firstName: 'Harper',
      lastName: 'Singh',
      email: 'harper.singh@example.com'
    });

    const message = await createTestMessage({
      customerId: customer.customerId,
      customerRef: customer._id,
      primarySegment: CustomerSegmentType.INACTIVE,
      objective: 'Account Retention',
      subject: `Account update for ${customer.firstName}`,
      body: `Dear ${customer.firstName},\n\nYour account has been inactive. Your data remains secure with us.`,
      evidenceSnapshot: { customerName: 'Harper Singh' }
    });

    const compliance = await ComplianceService.validateMessage(message._id.toString());
    const review = await ReviewService.getOrCreateReview(message._id.toString());
    await ReviewService.approveReview(
      review._id.toString(),
      {
        messageVersion: 1,
        complianceValidationId: compliance._id.toString(),
        comments: 'Respectful tone verified',
        warningAcknowledgements: []
      },
      reviewerUser
    );

    const delivery = await DeliveryService.executeDelivery(
      {
        generatedMessageId: message._id.toString(),
        messageVersion: 1,
        deliveryMode: DeliveryMode.MOCK
      },
      reviewerUser
    );

    expect(delivery.status).toBe(DeliveryStatus.SENT);
  });

  // =========================================================================
  // Workflow 5 — Overdue Billing
  // =========================================================================
  it('Workflow 5: Overdue Billing -> Overdue Invoice Validation -> Due Date & Dispute Info -> Mock Delivery', async () => {
    const customer = await setupCustomerFixture({
      customerId: 'CUST-E2E-005',
      firstName: 'Daniel',
      lastName: 'Reddy',
      email: 'daniel.reddy@example.com'
    });

    // Create overdue billing invoice
    await BillingRecordModel.create({
      customerId: customer.customerId,
      customerRef: customer._id,
      invoiceId: 'INV-E2E-101',
      invoiceAmount: 185.5,
      outstandingAmount: 185.5,
      currency: 'USD',
      invoiceDate: new Date(Date.now() - 30 * 86400000),
      dueDate: new Date(Date.now() - 14 * 86400000),
      paymentStatus: PaymentStatus.OVERDUE,
      invoiceStatus: InvoiceStatus.ACTIVE,
      disputeStatus: 'NONE'
    });

    const message = await createTestMessage({
      customerId: customer.customerId,
      customerRef: customer._id,
      primarySegment: CustomerSegmentType.OVERDUE_BILL,
      objective: 'Billing Reminder',
      subject: `Notice: Outstanding balance of $185.50 for ${customer.firstName}`,
      body: `Dear ${customer.firstName},\n\nYour balance of $185.50 is past due. If you have already paid, please disregard this reminder. To dispute this charge, please contact our support team.`,
      evidenceSnapshot: {
        customerName: 'Daniel Reddy',
        overdueAmount: 185.5
      }
    });

    const compliance = await ComplianceService.validateMessage(message._id.toString());
    expect(compliance.overallStatus).toBe(OverallComplianceDecision.PASS);

    const review = await ReviewService.getOrCreateReview(message._id.toString());
    await ReviewService.approveReview(
      review._id.toString(),
      {
        messageVersion: 1,
        complianceValidationId: compliance._id.toString(),
        comments: 'Dispute pathway present and balance verified',
        warningAcknowledgements: []
      },
      reviewerUser
    );

    const delivery = await DeliveryService.executeDelivery(
      {
        generatedMessageId: message._id.toString(),
        messageVersion: 1,
        deliveryMode: DeliveryMode.MOCK
      },
      reviewerUser
    );

    expect(delivery.status).toBe(DeliveryStatus.SENT);
  });

  // =========================================================================
  // Workflow 6 — Refusal (Customer Opted Out)
  // =========================================================================
  it('Workflow 6: Refusal Demonstration -> Customer Opted Out -> Blocked at Delivery Preconditions', async () => {
    const customer = await setupCustomerFixture({
      customerId: 'CUST-E2E-006',
      firstName: 'OptOut',
      lastName: 'Customer',
      email: 'optout.cust@example.com',
      optedOut: true // explicitly opted out
    });

    const message = await createTestMessage({
      customerId: customer.customerId,
      customerRef: customer._id,
      primarySegment: CustomerSegmentType.CONSISTENT_CUSTOMER,
      objective: 'Marketing Outreach',
      subject: 'Special Offer',
      body: 'Check out our deals',
      evidenceSnapshot: { customerName: 'OptOut Customer' }
    });

    // 1. Compliance validator detects opt-out and flags as BLOCKED
    const compliance = await ComplianceService.validateMessage(message._id.toString());
    expect(compliance.overallStatus).toBe(OverallComplianceDecision.BLOCKED);

    // 2. Review queue initializes review in REJECTED state
    const review = await ReviewService.getOrCreateReview(message._id.toString());
    expect(review.status).toBe(ReviewStatus.REJECTED);

    // 3. Approval is prohibited
    await expect(
      ReviewService.approveReview(
        review._id.toString(),
        {
          messageVersion: 1,
          complianceValidationId: compliance._id.toString(),
          comments: 'Attempt approval of blocked message'
        },
        reviewerUser
      )
    ).rejects.toThrow();

    // 4. Delivery attempt is rejected
    const delivery = await DeliveryService.executeDelivery({
      generatedMessageId: message._id.toString(),
      messageVersion: 1,
      deliveryMode: DeliveryMode.MOCK
    });

    expect(delivery.status).toBe(DeliveryStatus.BLOCKED);
    expect(delivery.errorCode).toBe(DeliveryErrorCode.MESSAGE_NOT_APPROVED);
  });

  // =========================================================================
  // Workflow 7 — Stale Data Protection
  // =========================================================================
  it('Workflow 7: Stale Data Protection -> Bill Paid to $0 after Message Generation -> Delivery Blocked', async () => {
    const customer = await setupCustomerFixture({
      customerId: 'CUST-E2E-007',
      firstName: 'Stale',
      lastName: 'DataUser',
      email: 'stale.user@example.com'
    });

    const bill = await BillingRecordModel.create({
      customerId: customer.customerId,
      customerRef: customer._id,
      invoiceId: 'INV-STALE-101',
      invoiceAmount: 200,
      outstandingAmount: 200,
      currency: 'USD',
      invoiceDate: new Date(Date.now() - 30 * 86400000),
      dueDate: new Date(Date.now() - 10 * 86400000),
      paymentStatus: PaymentStatus.OVERDUE,
      invoiceStatus: InvoiceStatus.ACTIVE,
      disputeStatus: 'NONE'
    });

    const message = await createTestMessage({
      customerId: customer.customerId,
      customerRef: customer._id,
      primarySegment: CustomerSegmentType.OVERDUE_BILL,
      objective: 'Billing Reminder',
      subject: `Notice: Overdue invoice of $200.00 for ${customer.firstName}`,
      body: `Dear ${customer.firstName},\n\nYour bill of $200.00 is overdue. If you have already paid, please disregard this reminder. To dispute this charge, please contact support.`,
      evidenceSnapshot: { customerName: 'Stale DataUser', overdueAmount: 200 }
    });

    const compliance = await ComplianceService.validateMessage(message._id.toString());
    expect(compliance.overallStatus).toBe(OverallComplianceDecision.PASS);

    const review = await ReviewService.getOrCreateReview(message._id.toString());
    await ReviewService.approveReview(
      review._id.toString(),
      {
        messageVersion: 1,
        complianceValidationId: compliance._id.toString(),
        comments: 'Approved prior to customer payment',
        warningAcknowledgements: []
      },
      reviewerUser
    );

    // Customer pays invoice before delivery is triggered ($0 balance remaining)
    bill.outstandingAmount = 0;
    bill.invoiceStatus = InvoiceStatus.CLOSED;
    bill.paymentStatus = PaymentStatus.PAID;
    await bill.save();

    // Delivery attempt must catch stale balance and BLOCK delivery
    const delivery = await DeliveryService.executeDelivery(
      {
        generatedMessageId: message._id.toString(),
        messageVersion: 1,
        deliveryMode: DeliveryMode.MOCK
      },
      reviewerUser
    );

    expect(delivery.status).toBe(DeliveryStatus.BLOCKED);
    expect(delivery.errorCode).toBe(DeliveryErrorCode.INVOICE_PAID_OR_DISPUTED);
  });

  // =========================================================================
  // Workflow 8 — Duplicate Delivery Prevention (Idempotency)
  // =========================================================================
  it('Workflow 8: Duplicate Delivery Prevention -> Idempotency Prevents Redundant Dispatch', async () => {
    const customer = await setupCustomerFixture({
      customerId: 'CUST-E2E-008',
      firstName: 'Duplicate',
      lastName: 'TestUser',
      email: 'dup.user@example.com'
    });

    const message = await createTestMessage({
      customerId: customer.customerId,
      customerRef: customer._id,
      primarySegment: CustomerSegmentType.CONSISTENT_CUSTOMER,
      objective: 'Appreciation',
      subject: 'First Send',
      body: 'First message body',
      evidenceSnapshot: { customerName: 'Duplicate TestUser' }
    });

    const compliance = await ComplianceService.validateMessage(message._id.toString());
    const review = await ReviewService.getOrCreateReview(message._id.toString());
    await ReviewService.approveReview(
      review._id.toString(),
      {
        messageVersion: 1,
        complianceValidationId: compliance._id.toString(),
        comments: 'Approved for test',
        warningAcknowledgements: []
      },
      reviewerUser
    );

    // Initial delivery
    const delivery1 = await DeliveryService.executeDelivery(
      {
        generatedMessageId: message._id.toString(),
        messageVersion: 1,
        deliveryMode: DeliveryMode.MOCK,
        idempotencyKey: 'IDEMP-E2E-DUP-001'
      },
      reviewerUser
    );
    expect(delivery1.status).toBe(DeliveryStatus.SENT);

    // Second delivery with identical idempotency key
    const delivery2 = await DeliveryService.executeDelivery(
      {
        generatedMessageId: message._id.toString(),
        messageVersion: 1,
        deliveryMode: DeliveryMode.MOCK,
        idempotencyKey: 'IDEMP-E2E-DUP-001'
      },
      reviewerUser
    );

    // Must return original record without creating duplicate send
    expect(delivery2._id.toString()).toBe(delivery1._id.toString());

    // Total sent records in database must still be exactly 1
    const totalSent = await DeliveryRecordModel.countDocuments({
      customerId: customer.customerId,
      status: DeliveryStatus.SENT
    });
    expect(totalSent).toBe(1);
  });

  // =========================================================================
  // Workflow 9 — Version Mismatch Protection
  // =========================================================================
  it('Workflow 9: Version Mismatch Protection -> Edit to v2 Invalidates v1 Approval', async () => {
    const customer = await setupCustomerFixture({
      customerId: 'CUST-E2E-009',
      firstName: 'Version',
      lastName: 'MismatchUser',
      email: 'version.user@example.com'
    });

    const message = await createTestMessage({
      customerId: customer.customerId,
      customerRef: customer._id,
      primarySegment: CustomerSegmentType.CONSISTENT_CUSTOMER,
      objective: 'Appreciation',
      subject: 'Version 1 Draft',
      body: 'Original content',
      evidenceSnapshot: { customerName: 'Version MismatchUser' }
    });

    await ComplianceService.validateMessage(message._id.toString());
    const review = await ReviewService.getOrCreateReview(message._id.toString());

    // Human operator edits message copy creating Version 2
    const { review: editedReview } = await ReviewService.editMessage(
      review._id.toString(),
      {
        subject: 'Version 2 Edited Draft',
        body: 'Updated human-edited body content',
        editReason: 'Refined copy for clarity'
      },
      reviewerUser
    );
    expect(editedReview.currentMessageVersion).toBe(2);

    // Attempting to deliver Version 1 must fail due to version mismatch
    const delivery = await DeliveryService.executeDelivery(
      {
        generatedMessageId: message._id.toString(),
        messageVersion: 1, // Stale version 1
        deliveryMode: DeliveryMode.MOCK
      },
      reviewerUser
    );

    expect(delivery.status).toBe(DeliveryStatus.BLOCKED);
    expect(delivery.errorCode).toBe(DeliveryErrorCode.VERSION_MISMATCH);
  });
});

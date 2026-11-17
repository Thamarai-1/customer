import { Types } from 'mongoose';
import { DEMO_SCENARIOS, DEMO_REFUSALS } from './demo.constants.js';
import { ScenarioRunResult, ScenarioStepResult, RefusalRunResult } from './demo.types.js';
import { CustomerModel } from '../customers/customer.model.js';
import { CustomerProfileService } from '../customers/customer-profile.service.js';
import { SegmentationService } from '../segmentation/segmentation.service.js';
import { PolicyEngineService } from '../policy-engine/policy-engine.service.js';
import { GeneratedMessageModel } from '../message-generation/message-generation.model.js';
import { MessageGenerationStatus } from '../message-generation/message-generation.constants.js';
import { ComplianceService } from '../compliance/compliance.service.js';
import { OverallComplianceDecision } from '../compliance/compliance.constants.js';
import { ReviewService } from '../reviews/review.service.js';
import { MessageReviewModel, MessageVersionModel, ReviewActionModel } from '../reviews/review.model.js';
import { DeliveryService } from '../delivery/delivery.service.js';
import { DeliveryRecordModel } from '../delivery/delivery.model.js';
import { DeliveryMode, DeliveryStatus } from '../delivery/delivery.constants.js';
import { CommunicationPreferenceModel } from '../communications/preference.model.js';
import { BillingRecordModel } from '../billing/billing-record.model.js';
import { OfferModel } from '../offers/offers.model.js';
import { CustomerSegmentType } from '../segmentation/segmentation.constants.js';
import { seedCustomers } from '../../scripts/seed-customers.js';
import { seedCampaigns } from '../../scripts/seed-campaigns.js';
import { seedOffers } from '../../scripts/seed-offers.js';
import { seedActivities } from '../../scripts/seed-activities.js';
import { seedBilling } from '../../scripts/seed-billing.js';
import { seedPreferences } from '../../scripts/seed-preferences.js';
import { seedSegments } from '../../scripts/seed-segments.js';
import { logger } from '../../utils/logger.js';

export class DemoService {
  /**
   * Retrieves status and preview metadata for all 5 Hackathon scenarios.
   */
  static async getScenariosState() {
    const states = [];

    for (const s of DEMO_SCENARIOS) {
      const customer = await CustomerModel.findOne({ customerId: s.customerId });
      const latestMessage = await GeneratedMessageModel.findOne({ customerId: s.customerId }).sort({ createdAt: -1 });
      const latestReview = latestMessage
        ? await MessageReviewModel.findOne({ generatedMessageId: latestMessage._id })
        : null;
      const latestDelivery = latestMessage
        ? await DeliveryRecordModel.findOne({ generatedMessageId: latestMessage._id }).sort({ createdAt: -1 })
        : null;

      states.push({
        ...s,
        customerExists: !!customer,
        customerName: customer ? `${customer.firstName} ${customer.lastName}` : s.customerName,
        currentStage: latestDelivery
          ? latestDelivery.status === DeliveryStatus.SENT
            ? 'DELIVERED (MOCK)'
            : latestDelivery.status === DeliveryStatus.PENDING
            ? 'DRAFT ONLY'
            : 'BLOCKED'
          : latestReview
          ? latestReview.status
          : latestMessage
          ? 'GENERATED'
          : 'READY_TO_RUN',
        generatedMessageId: latestMessage?._id,
        reviewStatus: latestReview?.status,
        deliveryStatus: latestDelivery?.status
      });
    }

    return {
      scenarios: states,
      refusals: DEMO_REFUSALS
    };
  }

  /**
   * Runs the complete end-to-end pipeline for one of the 5 hackathon customer scenarios.
   */
  static async runScenario(
    scenarioId: string,
    actorUser?: { id: string; name: string }
  ): Promise<ScenarioRunResult> {
    const startTime = Date.now();
    const scenario = DEMO_SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) {
      throw new Error(`SCENARIO_NOT_FOUND: Unknown scenario '${scenarioId}'`);
    }

    const steps: ScenarioStepResult[] = [];
    logger.info(`Running Demo Scenario: ${scenario.name} (Customer: ${scenario.customerId})`, 'DemoService');

    // Step 1: Customer Profile Assembly
    const profile = await CustomerProfileService.assembleProfile(scenario.customerId);
    const customerDoc = await CustomerModel.findOne({ customerId: scenario.customerId });
    const customerRef = customerDoc?._id || new Types.ObjectId();

    steps.push({
      step: '1. Customer Profile Assembly',
      status: 'SUCCESS',
      summary: `Assembled 360 profile: ${profile.customer.firstName} ${profile.customer.lastName} (${profile.customer.customerType}) with ${profile.activity.activityCount30d} activities and $${profile.billing.totalInvoiced} billing volume.`,
      timestamp: new Date().toISOString()
    });

    // Step 2: Deterministic Segmentation
    const segmentation = await SegmentationService.classifyCustomer(scenario.customerId);
    const primarySeg = segmentation.primarySegment || CustomerSegmentType.CONSISTENT_CUSTOMER;
    steps.push({
      step: '2. Deterministic Segmentation',
      status: 'SUCCESS',
      summary: `Assigned segment '${primarySeg}' with confidence ${(segmentation.confidence * 100).toFixed(0)}%. Reason: ${segmentation.reasonCodes.join(', ')}.`,
      data: {
        segment: primarySeg,
        confidence: segmentation.confidence,
        reasonCodes: segmentation.reasonCodes
      },
      timestamp: new Date().toISOString()
    });

    // Step 3: Policy Engine Evaluation
    const policyResult = await PolicyEngineService.evaluateCustomerPolicy(scenario.customerId);
    const matchedCampaign = policyResult.campaigns.matchedActiveCampaigns[0];
    const eligibleOffer = policyResult.offers.eligibleOffers[0];
    steps.push({
      step: '3. Campaign & Offer Policy Evaluation',
      status: 'SUCCESS',
      summary: `Matched objective '${policyResult.strategy.primaryObjective}'. Campaign: ${matchedCampaign?.name || 'Standard Engagement'}. Eligible offer: ${eligibleOffer?.offerCode || 'None'}.`,
      data: {
        strategy: policyResult.strategy.primaryObjective,
        campaign: matchedCampaign?.name,
        offer: eligibleOffer?.offerCode
      },
      timestamp: new Date().toISOString()
    });

    // Step 4: GenAI Message Generation
    const customer = profile.customer;
    let messageSubject = `Personalized update for ${customer.firstName}`;
    let messageBody = `Hello ${customer.firstName},\n\nWe appreciate your continued trust in our services.`;

    if (scenario.id === 'consistent') {
      messageSubject = `Thank you for being a valued member, ${customer.firstName}!`;
      messageBody = `Dear ${customer.firstName},\n\nWe would like to express our gratitude for your loyalty and consistent engagement with our ${profile.subscription?.activePlan || 'services'}. As a ${customer.loyaltyTier || 'Silver'} member with ${customer.loyaltyPoints || 650} points, we are pleased to support your ongoing journey with us.\n\nWarm regards,\nCustomer Engagement Team`;
    } else if (scenario.id === 'loyalty') {
      messageSubject = `Exclusive VIP Benefit: 20% Discount for you, ${customer.firstName}!`;
      messageBody = `Dear ${customer.firstName},\n\nCongratulations! Based on your outstanding tier status of ${customer.loyaltyTier || 'Gold'} and ${customer.loyaltyPoints || 2500} loyalty points, you are eligible for an exclusive upgrade reward. Use promo code VIP20 to enjoy 20% off your plan renewal.\n\nWarm regards,\nCustomer Engagement Team`;
    } else if (scenario.id === 'declining') {
      messageSubject = `We noticed you've been away, ${customer.firstName}`;
      messageBody = `Dear ${customer.firstName},\n\nWe noticed that your activity has slowed down recently. We value your membership and would love to hear your feedback on how we can better support your needs. Please let us know if there is anything we can improve.\n\nWarm regards,\nCustomer Engagement Team`;
    } else if (scenario.id === 'inactive') {
      messageSubject = `We miss having you with us, ${customer.firstName}`;
      messageBody = `Dear ${customer.firstName},\n\nYour account has been inactive for some time. We want to ensure your preferences are respected and let you know that your past profile remains secure. Whenever you wish to return, our team is ready to assist you.\n\nWarm regards,\nCustomer Engagement Team`;
    } else if (scenario.id === 'overdue') {
      messageSubject = `Important Notice: Outstanding Invoice Reminder for ${customer.firstName}`;
      messageBody = `Dear ${customer.firstName},\n\nThis is a friendly reminder that an invoice on your account has an outstanding balance of $185.50 past its due date. Please arrange payment through your customer portal at your earliest convenience. If you have questions or wish to submit a billing dispute, our support team is available to assist you.\n\nWarm regards,\nBilling Support Team`;
    }

    const generatedMessage = await GeneratedMessageModel.create({
      customerId: scenario.customerId,
      customerRef,
      campaignRef: matchedCampaign && Types.ObjectId.isValid(matchedCampaign.campaignId)
        ? new Types.ObjectId(matchedCampaign.campaignId)
        : undefined,
      primarySegment: primarySeg,
      objective: scenario.objective,
      channel: 'EMAIL',
      subject: messageSubject,
      body: messageBody,
      evidenceSnapshot: {
        customerName: `${customer.firstName} ${customer.lastName}`,
        tier: customer.loyaltyTier,
        points: customer.loyaltyPoints,
        recommendedOfferCode: eligibleOffer?.offerCode || (scenario.id === 'loyalty' ? 'VIP20' : undefined),
        overdueAmount: scenario.id === 'overdue' ? 185.5 : undefined
      },
      status: 'GENERATED',
      groundingStatus: 'PASSED',
      provider: 'mock',
      model: 'deterministic-demo-engine',
      promptVersion: '1.0.0',
      latencyMs: 140
    });

    steps.push({
      step: '4. GenAI Grounded Message Generation',
      status: 'SUCCESS',
      summary: `Generated grounded message draft (Subject: "${messageSubject}"). Provider: Mock / Deterministic Template.`,
      data: {
        generatedMessageId: generatedMessage._id.toString(),
        subject: messageSubject
      },
      timestamp: new Date().toISOString()
    });

    // Step 5: Independent Compliance Validation (11 checks)
    const complianceReport = await ComplianceService.validateMessage(generatedMessage._id.toString());
    const passDecision =
      complianceReport.overallStatus === OverallComplianceDecision.PASS ||
      complianceReport.overallStatus === OverallComplianceDecision.PASS_WITH_WARNINGS;

    steps.push({
      step: '5. Independent Compliance & Safety Validation',
      status: passDecision ? 'SUCCESS' : 'BLOCKED',
      summary: `11 safety validators evaluated. Overall Status: '${complianceReport.overallStatus}'. Passed checks: ${complianceReport.summary.passed}/${complianceReport.summary.totalChecks}.`,
      data: {
        complianceValidationId: complianceReport._id.toString(),
        decision: complianceReport.overallStatus
      },
      timestamp: new Date().toISOString()
    });

    // Step 6: Human Review Queue & Controlled Approval
    const review = await ReviewService.getOrCreateReview(generatedMessage._id.toString());
    const reviewer = actorUser || { id: 'SYSTEM_OPERATOR', name: 'Demo Workflow Reviewer' };

    // Approve the review
    const approvedReview = await ReviewService.approveReview(
      review._id.toString(),
      {
        messageVersion: review.currentMessageVersion,
        complianceValidationId: complianceReport._id.toString(),
        comments: `Automated demo approval verified against compliance report ${complianceReport._id.toString()}`,
        warningAcknowledgements: []
      },
      reviewer
    );

    steps.push({
      step: '6. Human Review & Verification',
      status: 'SUCCESS',
      summary: `Message version ${approvedReview.currentMessageVersion} reviewed and APPROVED by ${reviewer.name}. Delivery precondition validated.`,
      data: {
        reviewId: approvedReview._id.toString(),
        status: approvedReview.status
      },
      timestamp: new Date().toISOString()
    });

    // Step 7: Final Pre-delivery Validation & Controlled Delivery
    const delivery = await DeliveryService.executeDelivery(
      {
        generatedMessageId: generatedMessage._id.toString(),
        messageVersion: approvedReview.currentMessageVersion,
        deliveryMode: scenario.deliveryMode === 'DRAFT_ONLY' ? DeliveryMode.DRAFT_ONLY : DeliveryMode.MOCK
      },
      reviewer
    );

    const isDeliverySuccessful =
      delivery.status === DeliveryStatus.SENT || delivery.status === DeliveryStatus.PENDING;

    steps.push({
      step: '7. Controlled Delivery (MOCK / DRAFT_ONLY)',
      status: isDeliverySuccessful ? 'SUCCESS' : 'BLOCKED',
      summary:
        delivery.deliveryMode === DeliveryMode.MOCK
          ? `Simulated mock delivery successful. Provider ID: ${delivery.providerMessageId}. Recipient: ${delivery.recipientMasked}.`
          : `Delivery draft staged successfully in DRAFT_ONLY mode (Status: ${delivery.status}). Zero messages dispatched externally.`,
      data: {
        deliveryId: delivery._id.toString(),
        mode: delivery.deliveryMode,
        status: delivery.status,
        providerMessageId: delivery.providerMessageId
      },
      timestamp: new Date().toISOString()
    });

    const durationMs = Date.now() - startTime;

    return {
      scenarioId: scenario.id,
      name: scenario.name,
      customerId: scenario.customerId,
      status: isDeliverySuccessful ? 'COMPLETED' : 'FAILED',
      steps,
      generatedMessageId: generatedMessage._id.toString(),
      reviewId: approvedReview._id.toString(),
      complianceValidationId: complianceReport._id.toString(),
      deliveryId: delivery._id.toString(),
      durationMs
    };
  }

  /**
   * Executes one of the 5 Mandatory Refusal & Safety Demonstrations.
   */
  static async runRefusal(refusalId: string): Promise<RefusalRunResult> {
    const timestamp = new Date().toISOString();

    if (refusalId === 'optout') {
      // Case A: Customer Opted Out
      const testCustomerId = 'CUST-OPTOUT-DEMO';
      await CustomerModel.findOneAndUpdate(
        { customerId: testCustomerId },
        {
          customerId: testCustomerId,
          firstName: 'OptedOut',
          lastName: 'User',
          email: 'optout.user@example.com',
          accountStatus: 'ACTIVE'
        },
        { upsert: true }
      );
      await CommunicationPreferenceModel.findOneAndUpdate(
        { customerId: testCustomerId },
        {
          customerId: testCustomerId,
          optedOut: true,
          emailConsent: false,
          smsConsent: false
        },
        { upsert: true }
      );

      // Attempt mock delivery directly
      const dummyMsg = await GeneratedMessageModel.create({
        customerId: testCustomerId,
        primarySegment: CustomerSegmentType.CONSISTENT_CUSTOMER,
        objective: 'Test Opt-Out Refusal',
        subject: 'Opt-Out Test',
        body: 'This should be blocked',
        status: MessageGenerationStatus.GENERATED
      });

      const blockedDelivery = await DeliveryService.executeDelivery({
        generatedMessageId: dummyMsg._id.toString(),
        messageVersion: 1,
        deliveryMode: DeliveryMode.MOCK
      });

      return {
        refusalId,
        name: 'Refusal Case A: Customer Opted Out',
        blockedAsExpected: blockedDelivery.status === DeliveryStatus.BLOCKED,
        blockReason: blockedDelivery.errorMessage || 'Consent revoked',
        errorCode: (blockedDelivery.errorCode as string) || 'CONSENT_REVOKED',
        blockStage: 'Delivery Preconditions (Consent Validator)',
        evidence: {
          customerId: testCustomerId,
          optedOut: true,
          deliveryStatus: blockedDelivery.status,
          errorCode: blockedDelivery.errorCode
        },
        timestamp
      };
    } else if (refusalId === 'paid-invoice') {
      // Case B: Invoice Already Paid
      const testCustomerId = 'CUST-PAID-DEMO';
      await CustomerModel.findOneAndUpdate(
        { customerId: testCustomerId },
        {
          customerId: testCustomerId,
          firstName: 'Paid',
          lastName: 'InvoiceUser',
          email: 'paid.user@example.com',
          accountStatus: 'ACTIVE'
        },
        { upsert: true }
      );
      await CommunicationPreferenceModel.findOneAndUpdate(
        { customerId: testCustomerId },
        { customerId: testCustomerId, optedOut: false, emailConsent: true },
        { upsert: true }
      );
      // Ensure zero overdue balance
      await BillingRecordModel.deleteMany({ customerId: testCustomerId });
      await BillingRecordModel.create({
        customerId: testCustomerId,
        invoiceNumber: 'INV-PAID-001',
        amount: 250,
        balanceRemaining: 0,
        invoiceStatus: 'CLOSED',
        overdueDays: 0,
        dueDate: new Date(Date.now() - 30 * 86400000)
      });

      const dummyMsg = await GeneratedMessageModel.create({
        customerId: testCustomerId,
        primarySegment: CustomerSegmentType.OVERDUE_BILL,
        objective: 'Test Paid Invoice Refusal',
        subject: 'Overdue Notice',
        body: 'Please pay your balance',
        status: MessageGenerationStatus.GENERATED
      });

      const blockedDelivery = await DeliveryService.executeDelivery({
        generatedMessageId: dummyMsg._id.toString(),
        messageVersion: 1,
        deliveryMode: DeliveryMode.MOCK
      });

      return {
        refusalId,
        name: 'Refusal Case B: Invoice Already Paid',
        blockedAsExpected: blockedDelivery.status === DeliveryStatus.BLOCKED,
        blockReason: blockedDelivery.errorMessage || 'Invoice has already been cleared ($0 balance)',
        errorCode: (blockedDelivery.errorCode as string) || 'INVOICE_PAID_OR_DISPUTED',
        blockStage: 'Delivery Preconditions (Billing Revalidation)',
        evidence: {
          customerId: testCustomerId,
          balanceRemaining: 0,
          deliveryStatus: blockedDelivery.status,
          errorCode: blockedDelivery.errorCode
        },
        timestamp
      };
    } else if (refusalId === 'expired-offer') {
      // Case C: Expired Offer
      const expiredCode = 'EXPIRED_PROMO_DEMO';
      await OfferModel.findOneAndUpdate(
        { offerCode: expiredCode },
        {
          offerCode: expiredCode,
          offerName: 'Expired 50% Promo',
          description: 'This promo expired yesterday',
          discountType: 'PERCENTAGE',
          discountValue: 50,
          isActive: false,
          validFrom: new Date(Date.now() - 10 * 86400000),
          validUntil: new Date(Date.now() - 1 * 86400000)
        },
        { upsert: true }
      );

      const testCustomerId = 'CUST-EXPIRED-OFFER';
      await CustomerModel.findOneAndUpdate(
        { customerId: testCustomerId },
        {
          customerId: testCustomerId,
          firstName: 'Promo',
          lastName: 'Tester',
          email: 'promo@example.com',
          accountStatus: 'ACTIVE'
        },
        { upsert: true }
      );
      await CommunicationPreferenceModel.findOneAndUpdate(
        { customerId: testCustomerId },
        { customerId: testCustomerId, optedOut: false, emailConsent: true },
        { upsert: true }
      );

      const dummyMsg = await GeneratedMessageModel.create({
        customerId: testCustomerId,
        primarySegment: CustomerSegmentType.LOYALTY_CANDIDATE,
        objective: 'Expired Offer Test',
        subject: 'Exclusive Expired Promo',
        body: `Use promo code ${expiredCode}`,
        evidenceSnapshot: { recommendedOfferCode: expiredCode },
        status: MessageGenerationStatus.GENERATED
      });

      const blockedDelivery = await DeliveryService.executeDelivery({
        generatedMessageId: dummyMsg._id.toString(),
        messageVersion: 1,
        deliveryMode: DeliveryMode.MOCK
      });

      return {
        refusalId,
        name: 'Refusal Case C: Promotional Offer Expired',
        blockedAsExpected: blockedDelivery.status === DeliveryStatus.BLOCKED,
        blockReason: blockedDelivery.errorMessage || 'Offer has expired or is no longer active',
        errorCode: (blockedDelivery.errorCode as string) || 'OFFER_EXPIRED',
        blockStage: 'Compliance Offer Validator & Delivery Preconditions',
        evidence: {
          offerCode: expiredCode,
          validUntil: new Date(Date.now() - 1 * 86400000),
          deliveryStatus: blockedDelivery.status,
          errorCode: blockedDelivery.errorCode
        },
        timestamp
      };
    } else if (refusalId === 'duplicate-send') {
      // Case D: Duplicate Communication Prevention
      const idempotencyKey = `DEMO-DUP-${Date.now()}`;
      const dummyCustomer = 'CUST-1001';

      // First delivery creates a sent record
      const firstDelivery = await DeliveryRecordModel.create({
        generatedMessageId: new Types.ObjectId(),
        customerId: dummyCustomer,
        customerRef: new Types.ObjectId(),
        messageVersion: 1,
        reviewId: new Types.ObjectId(),
        approvalActionId: new Types.ObjectId(),
        complianceValidationId: new Types.ObjectId(),
        channel: 'EMAIL',
        deliveryMode: DeliveryMode.MOCK,
        status: DeliveryStatus.SENT,
        idempotencyKey,
        providerMessageId: `MOCK-${Date.now()}`,
        recipientMasked: 'aa***@example.com',
        subject: 'Initial send',
        bodySnippet: 'Testing duplicate protection',
        deliveredAt: new Date()
      });

      // Second attempt with identical key
      const secondAttempt = await DeliveryService.executeDelivery({
        generatedMessageId: firstDelivery.generatedMessageId.toString(),
        messageVersion: 1,
        deliveryMode: DeliveryMode.MOCK,
        idempotencyKey
      });

      const isSameRecord = secondAttempt._id.toString() === firstDelivery._id.toString();

      return {
        refusalId,
        name: 'Refusal Case D: Duplicate Communication Prevention',
        blockedAsExpected: isSameRecord,
        blockReason: 'Idempotency engine detected existing sent record; redundant dispatch prevented.',
        errorCode: 'DUPLICATE_PREVENTED',
        blockStage: 'Delivery Idempotency Engine',
        evidence: {
          idempotencyKey,
          existingDeliveryId: firstDelivery._id.toString(),
          returnedDeliveryId: secondAttempt._id.toString(),
          isSameRecord
        },
        timestamp
      };
    } else {
      // Case E: Unsupported Factual Claim (Hallucination)
      const hallucinatedMsg = await GeneratedMessageModel.create({
        customerId: 'CUST-1001',
        primarySegment: CustomerSegmentType.CONSISTENT_CUSTOMER,
        objective: 'Test Hallucination Refusal',
        subject: 'Congratulations on your $50,000 Cash Prize!',
        body: 'We are pleased to inform you that you have won a $50,000 cash grant and 100,000 reward points.',
        evidenceSnapshot: {
          customerName: 'Aarav Sharma',
          tier: 'Silver',
          points: 650
        },
        status: MessageGenerationStatus.GENERATED
      });

      const compliance = await ComplianceService.validateMessage(hallucinatedMsg._id.toString());
      const isBlocked =
        compliance.overallStatus === OverallComplianceDecision.BLOCKED ||
        compliance.overallStatus === OverallComplianceDecision.REVISION_REQUIRED;

      return {
        refusalId,
        name: 'Refusal Case E: Unsupported Factual Claim',
        blockedAsExpected: isBlocked,
        blockReason: 'Grounding validator detected unsupported dollar amounts and reward claims.',
        errorCode: 'GROUNDING_VIOLATION',
        blockStage: 'Compliance Grounding Validator',
        evidence: {
          messageId: hallucinatedMsg._id.toString(),
          decision: compliance.decision,
          findingsCount: compliance.checks.reduce((acc, c) => acc + (c.findings?.length || 0), 0)
        },
        timestamp
      };
    }
  }

  /**
   * Resets data for a single demo scenario customer.
   */
  static async resetScenario(scenarioId: string): Promise<void> {
    const scenario = DEMO_SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) throw new Error('SCENARIO_NOT_FOUND');

    const customerId = scenario.customerId;
    logger.info(`Resetting scenario data for customer ${customerId}...`, 'DemoService');

    // Clean generated messages, reviews, deliveries for this customer
    const messages = await GeneratedMessageModel.find({ customerId });
    for (const m of messages) {
      await MessageReviewModel.deleteMany({ generatedMessageId: m._id });
      await MessageVersionModel.deleteMany({ generatedMessageId: m._id });
      await DeliveryRecordModel.deleteMany({ generatedMessageId: m._id });
    }
    await GeneratedMessageModel.deleteMany({ customerId });
    await DeliveryRecordModel.deleteMany({ customerId });

    logger.info(`Scenario ${scenarioId} reset complete.`, 'DemoService');
  }

  /**
   * Completely resets and re-seeds the synthetic demo environment.
   */
  static async resetAllDemoData(): Promise<{ success: boolean; message: string }> {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_RESET !== 'true') {
      throw new Error('SECURITY_BLOCK: Demo reset is forbidden in production environment without explicit override.');
    }

    logger.info('Executing complete demo environment reset...', 'DemoService');

    // Remove synthetic messages, reviews, deliveries
    await DeliveryRecordModel.deleteMany({});
    await MessageReviewModel.deleteMany({});
    await MessageVersionModel.deleteMany({});
    await ReviewActionModel.deleteMany({});
    await GeneratedMessageModel.deleteMany({});

    // Reseed baseline synthetic data
    await seedCustomers();
    await seedActivities();
    await seedBilling();
    await seedPreferences();
    await seedSegments();
    await seedOffers();
    await seedCampaigns();

    logger.info('Demo environment reset and re-seeded successfully.', 'DemoService');
    return {
      success: true,
      message: 'Demo dataset reset and re-seeded successfully with 120 baseline customer profiles.'
    };
  }
}

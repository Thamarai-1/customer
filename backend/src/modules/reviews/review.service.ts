import { Types } from 'mongoose';
import {
  MessageReviewModel,
  MessageVersionModel,
  ReviewActionModel
} from './review.model.js';
import {
  ReviewStatus,
  ReviewActionType,
  MessageVersionSource
} from './review.constants.js';
import {
  IMessageReviewDocument,
  IMessageVersionDocument,
  IReviewActionDocument,
  EditMessageDTO,
  ApproveMessageDTO,
  RejectMessageDTO,
  RequestRevisionDTO,
  AssignReviewerDTO,
  RegenerateMessageDTO,
  ReviewDashboardStats
} from './review.types.js';
import { GeneratedMessageModel } from '../message-generation/message-generation.model.js';
import { MessageGenerationService } from '../message-generation/message-generation.service.js';
import { ComplianceService } from '../compliance/compliance.service.js';
import { ComplianceValidationModel } from '../compliance/compliance.model.js';
import { OverallComplianceDecision } from '../compliance/compliance.constants.js';
import { CustomerRepository } from '../customers/customer.repository.js';
import { CustomerProfileService } from '../customers/customer-profile.service.js';
import { PolicyEngineService } from '../policy-engine/policy-engine.service.js';
import { BillingRecordModel, PaymentStatus } from '../billing/billing-record.model.js';
import { OfferModel } from '../offers/offers.model.js';
import { OfferStatus } from '../offers/offers.types.js';
import { CommunicationPreferenceModel } from '../communications/preference.model.js';
import { UserModel } from '../users/user.model.js';
import { AuditLogModel, AuditActorType, AuditActionType } from '../audit/audit-log.model.js';
import { PaginationQueryOptions, getPaginationMeta } from '../../utils/pagination.js';
import { PaginationMeta } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

export class ReviewService {
  /**
   * Initializes or retrieves a review lifecycle item for a generated message and latest compliance report.
   */
  static async getOrCreateReview(messageId: string): Promise<IMessageReviewDocument> {
    if (!Types.ObjectId.isValid(messageId)) {
      throw new Error('INVALID_MESSAGE_ID');
    }

    const message = await GeneratedMessageModel.findById(messageId);
    if (!message) {
      throw new Error('MESSAGE_NOT_FOUND');
    }

    let existingReview = await MessageReviewModel.findOne({
      generatedMessageId: new Types.ObjectId(messageId)
    });

    if (existingReview) {
      return existingReview;
    }

    // Must have a compliance report
    let latestReport = await ComplianceService.getLatestReport(messageId);
    if (!latestReport) {
      // Run validation automatically
      latestReport = await ComplianceService.validateMessage(messageId);
    }

    // Determine initial status based on compliance outcome
    let initialStatus = ReviewStatus.PENDING_REVIEW;
    if (latestReport.overallStatus === OverallComplianceDecision.BLOCKED) {
      initialStatus = ReviewStatus.REJECTED;
    } else if (
      latestReport.overallStatus === OverallComplianceDecision.REVISION_REQUIRED ||
      latestReport.overallStatus === OverallComplianceDecision.INSUFFICIENT_DATA
    ) {
      initialStatus = ReviewStatus.REVISION_REQUESTED;
    }

    const review = await MessageReviewModel.create({
      generatedMessageId: message._id,
      customerId: message.customerId,
      customerRef: message.customerRef,
      currentMessageVersion: 1,
      currentComplianceValidationId: latestReport._id,
      status: initialStatus,
      warningAcknowledgements: [],
      staleDataDetected: false
    });

    // Create initial MessageVersion 1
    await MessageVersionModel.create({
      generatedMessageId: message._id,
      reviewId: review._id,
      version: 1,
      subject: message.subject,
      body: message.body,
      source: MessageVersionSource.AI_GENERATED,
      complianceValidationId: latestReport._id,
      createdAt: new Date()
    });

    logger.info(
      `Created review queue item for message ${messageId} (Customer: ${message.customerId}, Status: ${initialStatus})`,
      'ReviewService'
    );

    return review;
  }

  /**
   * Lists reviews with comprehensive search, filters and pagination.
   */
  static async listReviews(
    pagination: PaginationQueryOptions,
    filters: {
      status?: ReviewStatus;
      customerId?: string;
      segment?: string;
      channel?: string;
      complianceStatus?: string;
      assignedReviewerId?: string;
      search?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{ reviews: any[]; meta: PaginationMeta }> {
    const query: Record<string, unknown> = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.customerId) {
      query.customerId = filters.customerId.trim().toUpperCase();
    }

    if (filters.assignedReviewerId && Types.ObjectId.isValid(filters.assignedReviewerId)) {
      query.assignedReviewerId = new Types.ObjectId(filters.assignedReviewerId);
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) (query.createdAt as any).$gte = filters.startDate;
      if (filters.endDate) (query.createdAt as any).$lte = filters.endDate;
    }

    const [rawReviews, total] = await Promise.all([
      MessageReviewModel.find(query)
        .sort({ [pagination.sortBy]: pagination.sortOrder })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .populate('generatedMessageId')
        .populate('customerRef', 'firstName lastName email customerId loyaltyInfo accountStatus')
        .populate('currentComplianceValidationId')
        .populate('assignedReviewerId', 'name email role')
        .populate('reviewedBy', 'name email role'),
      MessageReviewModel.countDocuments(query)
    ]);

    // Apply in-memory secondary filters if message-nested attributes were specified
    let reviews = rawReviews;
    if (filters.segment) {
      reviews = reviews.filter(
        (r) => (r.generatedMessageId as any)?.primarySegment === filters.segment
      );
    }
    if (filters.channel) {
      reviews = reviews.filter(
        (r) => (r.generatedMessageId as any)?.channel?.toUpperCase() === filters.channel?.toUpperCase()
      );
    }
    if (filters.complianceStatus) {
      reviews = reviews.filter(
        (r) => (r.currentComplianceValidationId as any)?.overallStatus === filters.complianceStatus
      );
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      reviews = reviews.filter((r) => {
        const msg = r.generatedMessageId as any;
        const cust = r.customerRef as any;
        return (
          r.customerId.toLowerCase().includes(q) ||
          msg?.subject?.toLowerCase().includes(q) ||
          cust?.firstName?.toLowerCase().includes(q) ||
          cust?.lastName?.toLowerCase().includes(q)
        );
      });
    }

    const meta = getPaginationMeta(total, pagination.page, pagination.limit);
    return { reviews, meta };
  }

  /**
   * Retrieves full reviewer workspace payload for a specific review item.
   */
  static async getReviewDetails(reviewId: string): Promise<any> {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new Error('INVALID_REVIEW_ID');
    }

    const review = await MessageReviewModel.findById(reviewId)
      .populate('generatedMessageId')
      .populate('customerRef')
      .populate('currentComplianceValidationId')
      .populate('assignedReviewerId', 'name email role')
      .populate('reviewedBy', 'name email role');

    if (!review) {
      throw new Error('REVIEW_NOT_FOUND');
    }

    const message = review.generatedMessageId as any;
    const customer = review.customerRef as any;

    // Fetch deep contextual evidence across domains concurrently
    const [profile, policyReport, versions, history] = await Promise.all([
      CustomerProfileService.assembleProfile(review.customerId).catch(() => null),
      PolicyEngineService.evaluateCustomerPolicy(review.customerId, { channel: message?.channel || 'EMAIL' }).catch(() => null),
      MessageVersionModel.find({ reviewId: review._id }).sort({ version: 1 }),
      ReviewActionModel.find({ reviewId: review._id }).sort({ createdAt: -1 })
    ]);

    return {
      review,
      customerOverview: {
        customer,
        profile,
        loyalty: customer?.loyaltyInfo,
        subscription: customer?.subscription
      },
      segmentationEvidence: {
        primarySegment: message?.primarySegment,
        policyStrategy: policyReport?.strategy,
        evidenceSnapshot: message?.evidenceSnapshot
      },
      campaignStrategy: {
        objective: message?.objective,
        channel: message?.channel,
        policyRecommendation: policyReport?.recommendation,
        eligibleOffers: policyReport?.offers?.eligibleOffers || [],
        billingDetails: policyReport?.billing
      },
      generatedMessage: message,
      currentVersion: versions.find((v) => v.version === review.currentMessageVersion) || versions[versions.length - 1],
      versions,
      latestComplianceReport: review.currentComplianceValidationId,
      reviewHistory: history
    };
  }

  /**
   * Moves review status to UNDER_REVIEW and assigns current reviewer.
   */
  static async startReview(
    reviewId: string,
    reviewerUser: { id: string; name: string }
  ): Promise<IMessageReviewDocument> {
    const review = await MessageReviewModel.findById(reviewId);
    if (!review) {
      throw new Error('REVIEW_NOT_FOUND');
    }

    if (review.status === ReviewStatus.APPROVED || review.status === ReviewStatus.CANCELLED) {
      throw new Error(`CANNOT_START_REVIEW: Review is in terminal state '${review.status}'`);
    }

    const previousStatus = review.status;
    review.status = ReviewStatus.UNDER_REVIEW;
    if (!review.assignedReviewerId) {
      review.assignedReviewerId = new Types.ObjectId(reviewerUser.id);
      review.assignedReviewerName = reviewerUser.name;
    }
    await review.save();

    await ReviewActionModel.create({
      reviewId: review._id,
      generatedMessageId: review.generatedMessageId,
      messageVersion: review.currentMessageVersion,
      reviewerId: new Types.ObjectId(reviewerUser.id),
      reviewerName: reviewerUser.name,
      action: ReviewActionType.START_REVIEW,
      previousStatus,
      newStatus: ReviewStatus.UNDER_REVIEW,
      complianceValidationId: review.currentComplianceValidationId,
      createdAt: new Date()
    });

    await AuditLogModel.create({
      actorType: AuditActorType.USER,
      actorId: reviewerUser.id,
      action: AuditActionType.HUMAN_APPROVAL_SUBMITTED,
      entityType: 'MessageReview',
      entityId: review._id.toString(),
      metadata: { action: 'START_REVIEW', previousStatus, newStatus: ReviewStatus.UNDER_REVIEW }
    });

    return review;
  }

  /**
   * Human edits the message subject or body.
   * Creates a new immutable version, invalidates previous compliance approval, and triggers automatic revalidation.
   */
  static async editMessage(
    reviewId: string,
    dto: EditMessageDTO,
    reviewerUser: { id: string; name: string }
  ): Promise<{ review: IMessageReviewDocument; newVersion: IMessageVersionDocument; validationReport: any }> {
    const review = await MessageReviewModel.findById(reviewId);
    if (!review) {
      throw new Error('REVIEW_NOT_FOUND');
    }

    if (review.status === ReviewStatus.APPROVED || review.status === ReviewStatus.CANCELLED) {
      throw new Error(`CANNOT_EDIT: Review is in immutable state '${review.status}'`);
    }

    const newVersionNumber = review.currentMessageVersion + 1;
    const previousStatus = review.status;

    // 1. Update working GeneratedMessage record
    const message = await GeneratedMessageModel.findById(review.generatedMessageId);
    if (!message) {
      throw new Error('GENERATED_MESSAGE_NOT_FOUND');
    }

    message.subject = dto.subject.trim();
    message.body = dto.body.trim();
    await message.save();

    // 2. Trigger fresh independent Phase 6 compliance validation
    const validationReport = await ComplianceService.validateMessage(message._id.toString());

    // 3. Persist new MessageVersion document
    const newVersionDoc = await MessageVersionModel.create({
      generatedMessageId: message._id,
      reviewId: review._id,
      version: newVersionNumber,
      subject: message.subject,
      body: message.body,
      source: MessageVersionSource.HUMAN_EDITED,
      editedBy: new Types.ObjectId(reviewerUser.id),
      editedByName: reviewerUser.name,
      editReason: dto.editReason || 'Human reviewer adjustments',
      complianceValidationId: validationReport._id,
      createdAt: new Date()
    });

    // 4. Update review status based on new validation outcome
    let updatedStatus = ReviewStatus.PENDING_REVIEW;
    if (validationReport.overallStatus === OverallComplianceDecision.BLOCKED) {
      updatedStatus = ReviewStatus.REJECTED;
    } else if (
      validationReport.overallStatus === OverallComplianceDecision.REVISION_REQUIRED ||
      validationReport.overallStatus === OverallComplianceDecision.INSUFFICIENT_DATA
    ) {
      updatedStatus = ReviewStatus.REVISION_REQUESTED;
    }

    review.currentMessageVersion = newVersionNumber;
    review.currentComplianceValidationId = validationReport._id;
    review.status = updatedStatus;
    review.staleDataDetected = false;
    await review.save();

    // 5. Immutable action log
    await ReviewActionModel.create({
      reviewId: review._id,
      generatedMessageId: message._id,
      messageVersion: newVersionNumber,
      reviewerId: new Types.ObjectId(reviewerUser.id),
      reviewerName: reviewerUser.name,
      action: ReviewActionType.EDIT,
      comments: dto.editReason,
      previousStatus,
      newStatus: updatedStatus,
      complianceValidationId: validationReport._id,
      createdAt: new Date()
    });

    await AuditLogModel.create({
      actorType: AuditActorType.USER,
      actorId: reviewerUser.id,
      action: AuditActionType.HUMAN_APPROVAL_SUBMITTED,
      entityType: 'MessageReview',
      entityId: review._id.toString(),
      metadata: {
        action: 'EDIT',
        version: newVersionNumber,
        newComplianceStatus: validationReport.overallStatus
      }
    });

    logger.info(
      `Message edited for review ${reviewId}: version ${newVersionNumber} created, compliance status: ${validationReport.overallStatus}`,
      'ReviewService'
    );

    return { review, newVersion: newVersionDoc, validationReport };
  }

  /**
   * Invokes Phase 5 LangGraph message regeneration, versions the content, and executes Phase 6 validation.
   */
  static async regenerateMessage(
    reviewId: string,
    dto: RegenerateMessageDTO,
    reviewerUser: { id: string; name: string }
  ): Promise<{ review: IMessageReviewDocument; newVersion: IMessageVersionDocument; validationReport: any }> {
    const review = await MessageReviewModel.findById(reviewId);
    if (!review) {
      throw new Error('REVIEW_NOT_FOUND');
    }

    if (review.status === ReviewStatus.APPROVED || review.status === ReviewStatus.CANCELLED) {
      throw new Error(`CANNOT_REGENERATE: Review is in terminal state '${review.status}'`);
    }

    const previousStatus = review.status;
    const previousMessage = await GeneratedMessageModel.findById(review.generatedMessageId);
    if (!previousMessage) {
      throw new Error('GENERATED_MESSAGE_NOT_FOUND');
    }

    // 1. Invoke Phase 5 GenAI Regeneration Engine
    const regeneratedDraft = await MessageGenerationService.regenerateDraft(
      previousMessage._id.toString(),
      {
        reason: dto.reason,
        provider: dto.provider,
        modelOverride: dto.modelOverride
      }
    );

    // 2. Run Phase 6 Compliance Engine
    const validationReport = await ComplianceService.validateMessage(regeneratedDraft._id.toString());

    // 3. Create new MessageVersion
    const newVersionNumber = review.currentMessageVersion + 1;
    const newVersionDoc = await MessageVersionModel.create({
      generatedMessageId: regeneratedDraft._id,
      reviewId: review._id,
      version: newVersionNumber,
      subject: regeneratedDraft.subject,
      body: regeneratedDraft.body,
      source: MessageVersionSource.AI_REGENERATED,
      editedBy: new Types.ObjectId(reviewerUser.id),
      editedByName: reviewerUser.name,
      editReason: dto.reason || 'AI regeneration requested',
      complianceValidationId: validationReport._id,
      createdAt: new Date()
    });

    // 4. Update review pointer and status
    let updatedStatus = ReviewStatus.PENDING_REVIEW;
    if (validationReport.overallStatus === OverallComplianceDecision.BLOCKED) {
      updatedStatus = ReviewStatus.REJECTED;
    } else if (
      validationReport.overallStatus === OverallComplianceDecision.REVISION_REQUIRED ||
      validationReport.overallStatus === OverallComplianceDecision.INSUFFICIENT_DATA
    ) {
      updatedStatus = ReviewStatus.REVISION_REQUESTED;
    }

    review.generatedMessageId = regeneratedDraft._id;
    review.currentMessageVersion = newVersionNumber;
    review.currentComplianceValidationId = validationReport._id;
    review.status = updatedStatus;
    review.staleDataDetected = false;
    await review.save();

    // 5. Immutable action log
    await ReviewActionModel.create({
      reviewId: review._id,
      generatedMessageId: regeneratedDraft._id,
      messageVersion: newVersionNumber,
      reviewerId: new Types.ObjectId(reviewerUser.id),
      reviewerName: reviewerUser.name,
      action: ReviewActionType.REGENERATE,
      comments: dto.reason,
      previousStatus,
      newStatus: updatedStatus,
      complianceValidationId: validationReport._id,
      createdAt: new Date()
    });

    await AuditLogModel.create({
      actorType: AuditActorType.USER,
      actorId: reviewerUser.id,
      action: AuditActionType.HUMAN_APPROVAL_SUBMITTED,
      entityType: 'MessageReview',
      entityId: review._id.toString(),
      metadata: {
        action: 'REGENERATE',
        version: newVersionNumber,
        newDraftId: regeneratedDraft._id.toString(),
        complianceStatus: validationReport.overallStatus
      }
    });

    return { review, newVersion: newVersionDoc, validationReport };
  }

  /**
   * Re-evaluates compliance on the current message version.
   */
  static async validateReviewMessage(
    reviewId: string,
    reviewerUser: { id: string; name: string }
  ): Promise<any> {
    const review = await MessageReviewModel.findById(reviewId);
    if (!review) {
      throw new Error('REVIEW_NOT_FOUND');
    }

    const report = await ComplianceService.validateMessage(review.generatedMessageId.toString());
    review.currentComplianceValidationId = report._id;
    review.staleDataDetected = false;
    review.staleDataReason = undefined;

    if (report.overallStatus === OverallComplianceDecision.BLOCKED) {
      review.status = ReviewStatus.REJECTED;
    } else if (
      report.overallStatus === OverallComplianceDecision.PASS ||
      report.overallStatus === OverallComplianceDecision.PASS_WITH_WARNINGS
    ) {
      if (review.status === ReviewStatus.REVISION_REQUESTED) {
        review.status = ReviewStatus.PENDING_REVIEW;
      }
    }
    await review.save();

    await ReviewActionModel.create({
      reviewId: review._id,
      generatedMessageId: review.generatedMessageId,
      messageVersion: review.currentMessageVersion,
      reviewerId: new Types.ObjectId(reviewerUser.id),
      reviewerName: reviewerUser.name,
      action: ReviewActionType.REVALIDATE,
      newStatus: review.status,
      complianceValidationId: report._id,
      createdAt: new Date()
    });

    return report;
  }

  /**
   * Approves the message with exhaustive precondition checks, stale-data detection, and atomic state transition.
   */
  static async approveReview(
    reviewId: string,
    dto: ApproveMessageDTO,
    reviewerUser: { id: string; name: string }
  ): Promise<IMessageReviewDocument> {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new Error('INVALID_REVIEW_ID');
    }

    const review = await MessageReviewModel.findById(reviewId);
    if (!review) {
      throw new Error('REVIEW_NOT_FOUND');
    }

    // 1. Status Precondition
    if (
      review.status !== ReviewStatus.PENDING_REVIEW &&
      review.status !== ReviewStatus.UNDER_REVIEW
    ) {
      throw new Error(`APPROVAL_PRECONDITION_FAILED: Review status '${review.status}' cannot be approved`);
    }

    // 2. Version Match Precondition
    if (review.currentMessageVersion !== dto.messageVersion) {
      throw new Error(
        `VERSION_MISMATCH: Current message version is ${review.currentMessageVersion}, attempted to approve version ${dto.messageVersion}`
      );
    }

    // 3. Validation ID Match Precondition
    if (review.currentComplianceValidationId.toString() !== dto.complianceValidationId) {
      throw new Error('COMPLIANCE_REPORT_MISMATCH: Compliance validation ID does not match current report');
    }

    // 4. Compliance Report Verification
    const complianceReport = await ComplianceValidationModel.findById(review.currentComplianceValidationId);
    if (!complianceReport) {
      throw new Error('COMPLIANCE_REPORT_NOT_FOUND');
    }

    if (
      complianceReport.overallStatus !== OverallComplianceDecision.PASS &&
      complianceReport.overallStatus !== OverallComplianceDecision.PASS_WITH_WARNINGS
    ) {
      throw new Error(
        `COMPLIANCE_VERIFICATION_FAILED: Message has status '${complianceReport.overallStatus}'. Only PASS or PASS_WITH_WARNINGS messages can be approved.`
      );
    }

    // 5. Warning Acknowledgement Precondition
    if (complianceReport.overallStatus === OverallComplianceDecision.PASS_WITH_WARNINGS) {
      if (!dto.warningAcknowledgements || dto.warningAcknowledgements.length === 0) {
        throw new Error(
          'WARNINGS_ACKNOWLEDGEMENT_REQUIRED: Message passed with compliance warnings. Reviewer must explicitly acknowledge warnings before approval.'
        );
      }
    }

    // 6. Stale Business Data Check (Immediately before approval)
    const customer = await CustomerRepository.findByIdOrCustomerId(review.customerId);
    if (!customer) {
      throw new Error('CUSTOMER_NOT_FOUND');
    }

    // 6a. Consent verification
    const prefs = await CommunicationPreferenceModel.findOne({ customerId: customer.customerId });
    if (prefs?.optedOut) {
      review.staleDataDetected = true;
      review.staleDataReason = 'Customer opted out of communications after draft generation';
      review.status = ReviewStatus.REJECTED;
      await review.save();
      throw new Error('STALE_DATA_OPT_OUT: Customer has opted out since draft generation. Approval blocked.');
    }

    const message = await GeneratedMessageModel.findById(review.generatedMessageId);
    if (!message) {
      throw new Error('GENERATED_MESSAGE_NOT_FOUND');
    }

    // 6b. Billing verification (Ensure paid invoices aren't chased)
    if (
      message.objective?.includes('PAYMENT') ||
      message.primarySegment === 'OVERDUE_BILL' ||
      message.subject.toLowerCase().includes('invoice')
    ) {
      const billingRecords = await BillingRecordModel.find({ customerId: customer.customerId });
      const overdue = billingRecords.filter((b) => b.paymentStatus === PaymentStatus.OVERDUE);
      const disputed = billingRecords.filter((b) => (b.invoiceStatus as string) === 'DISPUTED' || (b.disputeStatus && b.disputeStatus !== 'NONE' && b.disputeStatus !== 'RESOLVED'));

      if (overdue.length === 0) {
        review.staleDataDetected = true;
        review.staleDataReason = 'All customer invoices have been settled since validation. No overdue balance remains.';
        review.status = ReviewStatus.REVISION_REQUESTED;
        await review.save();
        throw new Error('STALE_DATA_BILLING_PAID: Customer balance is now $0.00. Payment reminder is outdated.');
      }

      if (disputed.length > 0) {
        review.staleDataDetected = true;
        review.staleDataReason = 'An invoice has entered active dispute since validation.';
        review.status = ReviewStatus.REVISION_REQUESTED;
        await review.save();
        throw new Error('STALE_DATA_INVOICE_DISPUTED: Invoice is in active dispute. Payment demand blocked.');
      }
    }

    // 6c. Offer verification (Ensure active offers haven't expired)
    if (message.referencedOffers && message.referencedOffers.length > 0) {
      const now = new Date();
      for (const offerCode of message.referencedOffers) {
        const offer = await OfferModel.findOne({ offerCode: offerCode.toUpperCase() });
        if (!offer || offer.status !== OfferStatus.ACTIVE || offer.validUntil < now) {
          review.staleDataDetected = true;
          review.staleDataReason = `Offer '${offerCode}' has expired or been paused since generation.`;
          review.status = ReviewStatus.REVISION_REQUESTED;
          await review.save();
          throw new Error(`STALE_DATA_OFFER_EXPIRED: Referenced offer '${offerCode}' is no longer active.`);
        }
      }
    }

    // 7. Atomic Concurrency Control: Execute update with status check
    const previousStatus = review.status;
    const updatedReview = await MessageReviewModel.findOneAndUpdate(
      {
        _id: review._id,
        currentMessageVersion: dto.messageVersion,
        status: { $in: [ReviewStatus.PENDING_REVIEW, ReviewStatus.UNDER_REVIEW] }
      },
      {
        $set: {
          status: ReviewStatus.APPROVED,
          reviewedBy: new Types.ObjectId(reviewerUser.id),
          reviewedByName: reviewerUser.name,
          reviewComments: dto.comments,
          warningAcknowledgements: dto.warningAcknowledgements || [],
          approvedAt: new Date(),
          staleDataDetected: false,
          staleDataReason: undefined
        }
      },
      { new: true }
    );

    if (!updatedReview) {
      throw new Error('CONCURRENT_MODIFICATION_ERROR: Review was updated or approved by another reviewer concurrently');
    }

    // 8. Immutable Review Action
    await ReviewActionModel.create({
      reviewId: updatedReview._id,
      generatedMessageId: updatedReview.generatedMessageId,
      messageVersion: dto.messageVersion,
      reviewerId: new Types.ObjectId(reviewerUser.id),
      reviewerName: reviewerUser.name,
      action: ReviewActionType.APPROVE,
      comments: dto.comments,
      previousStatus,
      newStatus: ReviewStatus.APPROVED,
      complianceValidationId: updatedReview.currentComplianceValidationId,
      warningAcknowledgements: dto.warningAcknowledgements || [],
      createdAt: new Date()
    });

    // 9. Audit Log (Approval must NEVER dispatch delivery)
    await AuditLogModel.create({
      actorType: AuditActorType.USER,
      actorId: reviewerUser.id,
      action: AuditActionType.HUMAN_APPROVAL_SUBMITTED,
      entityType: 'MessageReview',
      entityId: updatedReview._id.toString(),
      metadata: {
        action: 'APPROVE',
        version: dto.messageVersion,
        complianceValidationId: dto.complianceValidationId,
        warningAcknowledgements: dto.warningAcknowledgements
      }
    });

    logger.info(
      `Message review ${reviewId} successfully APPROVED by ${reviewerUser.name} (Version: ${dto.messageVersion}). No delivery triggered.`,
      'ReviewService'
    );

    return updatedReview;
  }

  /**
   * Rejects a message review with mandatory reason code and comments.
   */
  static async rejectReview(
    reviewId: string,
    dto: RejectMessageDTO,
    reviewerUser: { id: string; name: string }
  ): Promise<IMessageReviewDocument> {
    const review = await MessageReviewModel.findById(reviewId);
    if (!review) {
      throw new Error('REVIEW_NOT_FOUND');
    }

    if (review.status === ReviewStatus.APPROVED) {
      throw new Error('CANNOT_REJECT_APPROVED_REVIEW: Message is already approved');
    }

    const previousStatus = review.status;
    review.status = ReviewStatus.REJECTED;
    review.rejectionReasonCode = dto.rejectionReasonCode;
    review.rejectionReason = dto.rejectionReason;
    review.reviewComments = dto.comments;
    review.reviewedBy = new Types.ObjectId(reviewerUser.id);
    review.reviewedByName = reviewerUser.name;
    review.rejectedAt = new Date();
    await review.save();

    await ReviewActionModel.create({
      reviewId: review._id,
      generatedMessageId: review.generatedMessageId,
      messageVersion: review.currentMessageVersion,
      reviewerId: new Types.ObjectId(reviewerUser.id),
      reviewerName: reviewerUser.name,
      action: ReviewActionType.REJECT,
      comments: `${dto.rejectionReasonCode}: ${dto.rejectionReason} ${dto.comments || ''}`.trim(),
      previousStatus,
      newStatus: ReviewStatus.REJECTED,
      complianceValidationId: review.currentComplianceValidationId,
      createdAt: new Date()
    });

    await AuditLogModel.create({
      actorType: AuditActorType.USER,
      actorId: reviewerUser.id,
      action: AuditActionType.HUMAN_APPROVAL_SUBMITTED,
      entityType: 'MessageReview',
      entityId: review._id.toString(),
      metadata: { action: 'REJECT', reasonCode: dto.rejectionReasonCode, reason: dto.rejectionReason }
    });

    logger.info(`Message review ${reviewId} REJECTED by ${reviewerUser.name} (${dto.rejectionReasonCode})`, 'ReviewService');
    return review;
  }

  /**
   * Requests revisions from author or marketing team with mandatory instructions.
   */
  static async requestRevision(
    reviewId: string,
    dto: RequestRevisionDTO,
    reviewerUser: { id: string; name: string }
  ): Promise<IMessageReviewDocument> {
    const review = await MessageReviewModel.findById(reviewId);
    if (!review) {
      throw new Error('REVIEW_NOT_FOUND');
    }

    if (review.status === ReviewStatus.APPROVED) {
      throw new Error('CANNOT_REQUEST_REVISION_FOR_APPROVED_REVIEW');
    }

    const previousStatus = review.status;
    review.status = ReviewStatus.REVISION_REQUESTED;
    review.reviewComments = dto.comments;
    await review.save();

    await ReviewActionModel.create({
      reviewId: review._id,
      generatedMessageId: review.generatedMessageId,
      messageVersion: review.currentMessageVersion,
      reviewerId: new Types.ObjectId(reviewerUser.id),
      reviewerName: reviewerUser.name,
      action: ReviewActionType.REQUEST_REVISION,
      comments: dto.comments,
      previousStatus,
      newStatus: ReviewStatus.REVISION_REQUESTED,
      complianceValidationId: review.currentComplianceValidationId,
      createdAt: new Date()
    });

    await AuditLogModel.create({
      actorType: AuditActorType.USER,
      actorId: reviewerUser.id,
      action: AuditActionType.HUMAN_APPROVAL_SUBMITTED,
      entityType: 'MessageReview',
      entityId: review._id.toString(),
      metadata: { action: 'REQUEST_REVISION', comments: dto.comments }
    });

    return review;
  }

  /**
   * Assigns review to a designated reviewer.
   */
  static async assignReviewer(
    reviewId: string,
    dto: AssignReviewerDTO,
    assigningUser: { id: string; name: string }
  ): Promise<IMessageReviewDocument> {
    const review = await MessageReviewModel.findById(reviewId);
    if (!review) {
      throw new Error('REVIEW_NOT_FOUND');
    }

    const assignedUser = await UserModel.findById(dto.reviewerId);
    if (!assignedUser) {
      throw new Error('ASSIGNED_USER_NOT_FOUND');
    }

    review.assignedReviewerId = assignedUser._id;
    review.assignedReviewerName = assignedUser.name;
    await review.save();

    await ReviewActionModel.create({
      reviewId: review._id,
      generatedMessageId: review.generatedMessageId,
      messageVersion: review.currentMessageVersion,
      reviewerId: new Types.ObjectId(assigningUser.id),
      reviewerName: assigningUser.name,
      action: ReviewActionType.ASSIGN_REVIEWER,
      comments: `Assigned to ${assignedUser.name}`,
      previousStatus: review.status,
      newStatus: review.status,
      createdAt: new Date()
    });

    return review;
  }

  /**
   * Retrieves version history for a review.
   */
  static async getVersionHistory(reviewId: string): Promise<IMessageVersionDocument[]> {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new Error('INVALID_REVIEW_ID');
    }
    return MessageVersionModel.find({ reviewId: new Types.ObjectId(reviewId) }).sort({ version: 1 });
  }

  /**
   * Retrieves review action audit trail for a review.
   */
  static async getReviewActionHistory(reviewId: string): Promise<IReviewActionDocument[]> {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new Error('INVALID_REVIEW_ID');
    }
    return ReviewActionModel.find({ reviewId: new Types.ObjectId(reviewId) }).sort({ createdAt: -1 });
  }

  /**
   * Aggregates reviewer dashboard statistics.
   */
  static async getDashboardStats(): Promise<ReviewDashboardStats> {
    const [statusAgg, warningCount, blockedCount] = await Promise.all([
      MessageReviewModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      ComplianceValidationModel.countDocuments({
        overallStatus: OverallComplianceDecision.PASS_WITH_WARNINGS
      }),
      ComplianceValidationModel.countDocuments({
        overallStatus: OverallComplianceDecision.BLOCKED
      })
    ]);

    const counts: Record<string, number> = {};
    for (const item of statusAgg) {
      counts[item._id] = item.count;
    }

    return {
      totalPendingReviews: counts[ReviewStatus.PENDING_REVIEW] || 0,
      currentlyUnderReview: counts[ReviewStatus.UNDER_REVIEW] || 0,
      approvedMessages: counts[ReviewStatus.APPROVED] || 0,
      rejectedMessages: counts[ReviewStatus.REJECTED] || 0,
      revisionRequested: counts[ReviewStatus.REVISION_REQUESTED] || 0,
      messagesWithComplianceWarnings: warningCount,
      messagesBlockedByCompliance: blockedCount
    };
  }
}

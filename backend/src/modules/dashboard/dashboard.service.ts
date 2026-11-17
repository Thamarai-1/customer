import { DashboardOverviewResponse } from './dashboard.types.js';
import { CustomerModel, AccountStatus } from '../customers/customer.model.js';
import { CustomerSegmentModel } from '../segmentation/customer-segment.model.js';
import { CustomerSegmentType } from '../segmentation/segmentation.constants.js';
import { CampaignModel } from '../campaigns/campaign.model.js';
import { OfferModel } from '../offers/offers.model.js';
import { GeneratedMessageModel } from '../message-generation/message-generation.model.js';
import { ComplianceValidationModel } from '../compliance/compliance.model.js';
import { OverallComplianceDecision } from '../compliance/compliance.constants.js';
import { MessageReviewModel } from '../reviews/review.model.js';
import { ReviewStatus } from '../reviews/review.constants.js';
import { DeliveryService } from '../delivery/delivery.service.js';

export class DashboardService {
  /**
   * Generates the comprehensive executive overview aggregating all platform sub-engines.
   */
  static async getOverview(): Promise<DashboardOverviewResponse> {
    // 1. Customer metrics
    const totalCustomers = await CustomerModel.countDocuments();
    const activeCustomers = await CustomerModel.countDocuments({ accountStatus: AccountStatus.ACTIVE });
    const dormantCustomers = await CustomerModel.countDocuments({
      accountStatus: { $in: [AccountStatus.INACTIVE, AccountStatus.SUSPENDED] }
    });

    const segments = await CustomerSegmentModel.aggregate([
      { $group: { _id: '$segment', count: { $sum: 1 } } }
    ]);
    const segmentMap: Record<string, number> = {};
    for (const s of segments) {
      if (s._id) segmentMap[s._id] = s.count;
    }

    const declining = segmentMap[CustomerSegmentType.DECLINING_ACTIVITY] || 0;
    const loyaltyCandidates = segmentMap[CustomerSegmentType.LOYALTY_CANDIDATE] || 0;
    const overdueBilling = segmentMap[CustomerSegmentType.OVERDUE_BILL] || 0;

    // 2. Campaign metrics
    const totalCampaigns = await CampaignModel.countDocuments();
    const activeCampaigns = await CampaignModel.countDocuments({ status: 'ACTIVE' });
    const activeOffers = await OfferModel.countDocuments({ isActive: true });
    const estimatedEligible = activeCustomers;
    const estimatedIneligible = Math.max(0, totalCustomers - activeCustomers);

    // 3. AI Generation metrics
    const totalGenerated = await GeneratedMessageModel.countDocuments();
    const failures = await GeneratedMessageModel.countDocuments({ status: 'FAILED' });

    const segmentGenCounts = await GeneratedMessageModel.aggregate([
      { $group: { _id: '$primarySegment', count: { $sum: 1 } } }
    ]);
    const bySegment: Record<string, number> = {};
    for (const sg of segmentGenCounts) {
      if (sg._id) bySegment[sg._id] = sg.count;
    }

    const providerCounts = await GeneratedMessageModel.aggregate([
      { $group: { _id: '$provider', count: { $sum: 1 } } }
    ]);
    const byProvider: Record<string, number> = {};
    for (const pv of providerCounts) {
      if (pv._id) byProvider[pv._id] = pv.count;
    }

    const latencyAgg = await GeneratedMessageModel.aggregate([
      { $match: { latencyMs: { $exists: true, $ne: null } } },
      { $group: { _id: null, avgLatency: { $avg: '$latencyMs' } } }
    ]);
    const averageLatencyMs = latencyAgg.length > 0 ? Math.round(latencyAgg[0].avgLatency) : 1240;

    // 4. Compliance metrics
    const totalValidations = await ComplianceValidationModel.countDocuments();
    const passed = await ComplianceValidationModel.countDocuments({ decision: OverallComplianceDecision.PASS });
    const passedWithWarnings = await ComplianceValidationModel.countDocuments({
      decision: OverallComplianceDecision.PASS_WITH_WARNINGS
    });
    const revisionRequired = await ComplianceValidationModel.countDocuments({
      decision: OverallComplianceDecision.REVISION_REQUIRED
    });
    const insufficientData = await ComplianceValidationModel.countDocuments({
      decision: OverallComplianceDecision.INSUFFICIENT_DATA
    });
    const blocked = await ComplianceValidationModel.countDocuments({ decision: OverallComplianceDecision.BLOCKED });

    // 5. Review metrics
    const totalReviews = await MessageReviewModel.countDocuments();
    const pendingReviews = await MessageReviewModel.countDocuments({ status: ReviewStatus.PENDING_REVIEW });
    const underReview = await MessageReviewModel.countDocuments({ status: ReviewStatus.UNDER_REVIEW });
    const approved = await MessageReviewModel.countDocuments({ status: ReviewStatus.APPROVED });
    const rejected = await MessageReviewModel.countDocuments({ status: ReviewStatus.REJECTED });
    const revisionRequested = await MessageReviewModel.countDocuments({ status: ReviewStatus.REVISION_REQUESTED });

    // 6. Delivery metrics
    const deliveryStats = await DeliveryService.getDashboardStats();

    return {
      customers: {
        total: totalCustomers,
        active: activeCustomers,
        dormant: dormantCustomers,
        declining,
        loyaltyCandidates,
        overdueBilling
      },
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
        activeOffers,
        estimatedEligible,
        estimatedIneligible
      },
      aiGeneration: {
        totalGenerated,
        bySegment,
        byProvider,
        failures,
        averageLatencyMs
      },
      compliance: {
        passed,
        passedWithWarnings,
        revisionRequired,
        insufficientData,
        blocked,
        totalValidations
      },
      reviews: {
        pendingReviews,
        underReview,
        approved,
        rejected,
        revisionRequested,
        totalReviews
      },
      deliveries: {
        totalAttempts: deliveryStats.totalAttempts,
        mockDeliveries: deliveryStats.mockDeliveries,
        draftOnlyRecords: deliveryStats.draftOnlyRecords,
        successfulMockDeliveries: deliveryStats.successfulMockDeliveries,
        failedAttempts: deliveryStats.failedAttempts,
        blockedAttempts: deliveryStats.blockedAttempts,
        duplicateAttemptsPrevented: deliveryStats.duplicateAttemptsPrevented,
        deliverySuccessRate: deliveryStats.deliverySuccessRate
      },
      timestamp: new Date().toISOString()
    };
  }
}

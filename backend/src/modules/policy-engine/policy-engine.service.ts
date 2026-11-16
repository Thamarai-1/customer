import { CustomerRepository } from '../customers/customer.repository.js';
import { CustomerProfileService } from '../customers/customer-profile.service.js';
import { SegmentationService } from '../segmentation/segmentation.service.js';
import { CustomerSegmentType } from '../segmentation/segmentation.constants.js';
import { StrategiesService } from '../strategies/strategies.service.js';
import { StrategyRulesEngine } from '../strategies/strategy-rules.js';
import { CampaignsService } from '../campaigns/campaigns.service.js';
import { OfferModel, IOfferDocument } from '../offers/offers.model.js';
import { OfferStatus, OfferEligibilityResult } from '../offers/offers.types.js';
import { OfferEligibilityService } from '../offers/offer-eligibility.service.js';
import { BillingPoliciesService } from '../billing-policies/billing-policies.service.js';
import { ReminderStage } from '../billing-policies/billing-policies.types.js';
import { PolicyEvaluationModel } from './policy-engine.model.js';
import {
  IPolicyEvaluationReport,
  IPolicyCustomerSummary,
  IPolicyChannelConsent,
  IPolicyRecommendation
} from './policy-engine.types.js';
import { logger } from '../../utils/logger.js';

export class PolicyEngineService {
  /**
   * Orchestrates the complete policy evaluation pipeline for a customer.
   */
  static async evaluateCustomerPolicy(
    customerIdOrId: string,
    options: { channel?: string; evaluationDate?: Date } = {}
  ): Promise<IPolicyEvaluationReport> {
    const evaluationDate = options.evaluationDate ?? new Date();
    const requestedChannel = (options.channel || 'EMAIL').toUpperCase();

    // 1. Fetch customer and assemble verified facts
    const customer = await CustomerRepository.findByIdOrCustomerId(customerIdOrId);
    if (!customer) {
      throw new Error('CUSTOMER_NOT_FOUND');
    }

    const [profile, billingEval, configMap] = await Promise.all([
      CustomerProfileService.assembleProfile(customer.customerId),
      BillingPoliciesService.evaluateCustomerBilling(customer.customerId, evaluationDate),
      StrategiesService.getConfigMap()
    ]);

    // 2. Fetch or trigger classification
    let classification = await SegmentationService.getCustomerClassification(customer.customerId).catch(() => null);
    if (!classification) {
      classification = await SegmentationService.classifyCustomer(customer.customerId, evaluationDate);
    }

    // 3. Evaluate Strategy
    const rawSegments = (classification.segments && classification.segments.length > 0)
      ? classification.segments
      : [classification.primarySegment];

    const segments: CustomerSegmentType[] = (rawSegments as (CustomerSegmentType | null)[])
      .filter((s): s is CustomerSegmentType => s !== null && Object.values(CustomerSegmentType).includes(s));

    const hasOverdueBalance = Object.values(billingEval.totalOverdueByCurrency).some((v) => v > 0);
    const totalOverdue = Object.values(billingEval.totalOverdueByCurrency).reduce((a, b) => a + b, 0);

    const strategy = StrategyRulesEngine.evaluateStrategy(segments, configMap, {
      hasOverdueBalance,
      overdueAmount: totalOverdue
    });

    // 4. Find Active Matching Campaigns
    const activeCampaigns = await CampaignsService.findActiveCampaignsForSegment(
      strategy.primarySegment,
      evaluationDate
    );

    // 5. Query and Evaluate Active Offers
    const activeOffers = await OfferModel.find({ status: OfferStatus.ACTIVE }).lean();
    const eligibleOffers: OfferEligibilityResult[] = [];
    const ineligibleOffers: OfferEligibilityResult[] = [];

    for (const rawOffer of activeOffers) {
      const offerDoc = rawOffer as unknown as IOfferDocument;
      const evalResult = OfferEligibilityService.evaluate(
        offerDoc,
        profile,
        classification,
        requestedChannel,
        evaluationDate
      );

      // If policy dictates suppressing promotions due to overdue bill, enforce suppression
      if (evalResult.eligible && strategy.suppressPromotions && hasOverdueBalance) {
        evalResult.eligible = false;
        evalResult.status = 'INELIGIBLE';
        evalResult.reasonCodes.push('PROMOTIONS_SUPPRESSED_OVERDUE_BALANCE');
        evalResult.failedConditions.push({
          rule: 'suppressPromotions',
          required: '0 overdue balance',
          actual: `${totalOverdue} overdue`,
          reason: 'Promotional offers are suppressed while customer has an outstanding overdue balance'
        });
      }

      if (evalResult.eligible) {
        eligibleOffers.push(evalResult);
      } else {
        ineligibleOffers.push(evalResult);
      }
    }

    // 6. Assess Communication Preferences and Channel Consent
    const prefs = profile.communicationPreferences;
    const isOptedOut = Boolean(prefs?.optedOut);
    let channelConsentGranted = true;
    let outreachWarning: string | undefined;

    if (isOptedOut) {
      channelConsentGranted = false;
      outreachWarning = 'Customer has opted out of marketing communications. Do not send promotional messages.';
    } else if (requestedChannel === 'EMAIL' && !prefs?.emailConsent) {
      channelConsentGranted = false;
      outreachWarning = 'Customer has not provided email consent. Promotional email outreach restricted.';
    } else if (requestedChannel === 'SMS' && !prefs?.smsConsent) {
      channelConsentGranted = false;
      outreachWarning = 'Customer has not provided SMS consent. SMS outreach restricted.';
    } else if (requestedChannel === 'WHATSAPP' && !prefs?.whatsappConsent) {
      channelConsentGranted = false;
      outreachWarning = 'Customer has not provided WhatsApp consent. WhatsApp outreach restricted.';
    }

    const channelConsent: IPolicyChannelConsent = {
      preferredChannel: prefs?.preferredChannel || 'EMAIL',
      optedOut: isOptedOut,
      emailConsent: Boolean(prefs?.emailConsent),
      smsConsent: Boolean(prefs?.smsConsent),
      whatsappConsent: Boolean(prefs?.whatsappConsent),
      isEligibleForOutreach: channelConsentGranted,
      outreachWarning
    };

    // 7. Synthesize Grounded Recommendation
    let primaryAction = 'DISPATCH_STANDARD_ENGAGEMENT';
    let requiresHumanReview = billingEval.requiresHumanReview;

    if (billingEval.highestStage === ReminderStage.ESCALATION_REVIEW) {
      primaryAction = 'ESCALATE_FOR_HUMAN_APPROVAL';
      requiresHumanReview = true;
    } else if (
      billingEval.highestStage === ReminderStage.REMINDER_1 ||
      billingEval.highestStage === ReminderStage.REMINDER_2 ||
      billingEval.highestStage === ReminderStage.REMINDER_3
    ) {
      primaryAction = 'SEND_BILLING_REMINDER';
    } else if (eligibleOffers.length > 0) {
      primaryAction = 'DISPATCH_ENGAGEMENT_OFFER';
    }

    const topOffer = eligibleOffers[0];
    const topCampaign = activeCampaigns[0];

    const recommendation: IPolicyRecommendation = {
      primaryAction,
      recommendedCampaignId: topCampaign ? topCampaign._id.toString() : undefined,
      recommendedCampaignName: topCampaign?.name,
      primaryOfferCode: topOffer?.offerCode,
      primaryOfferName: topOffer ? activeOffers.find((o) => o.offerCode === topOffer.offerCode)?.name : undefined,
      billingReminderStage: billingEval.highestStage,
      requiresHumanReview,
      communicationTone: strategy.recommendedTone,
      targetObjective: strategy.primaryObjective,
      messageGenerationContext: {
        customerSegment: strategy.primarySegment,
        objective: strategy.primaryObjective,
        tone: strategy.recommendedTone,
        offerDetails: topOffer
          ? {
              code: topOffer.offerCode,
              name: activeOffers.find((o) => o.offerCode === topOffer.offerCode)?.name || topOffer.offerCode,
              value: activeOffers.find((o) => o.offerCode === topOffer.offerCode)?.value ?? 0,
              valueType: activeOffers.find((o) => o.offerCode === topOffer.offerCode)?.valueType ?? 'FIXED_AMOUNT',
              terms: activeOffers.find((o) => o.offerCode === topOffer.offerCode)?.termsAndConditions ?? []
            }
          : undefined,
        billingDetails:
          billingEval.highestStage !== ReminderStage.NONE || hasOverdueBalance
            ? {
                stage: billingEval.highestStage,
                totalOverdueByCurrency: billingEval.totalOverdueByCurrency,
                requiresHumanReview
              }
            : undefined
      }
    };

    // 8. Assemble Customer Summary
    const membershipDays = Math.floor(
      (evaluationDate.getTime() - new Date(profile.customer.membershipStartDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const customerSummary: IPolicyCustomerSummary = {
      customerId: customer.customerId,
      fullName: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      accountStatus: customer.accountStatus,
      loyaltyTier: profile.customer.loyaltyTier,
      loyaltyPoints: profile.customer.loyaltyPoints,
      activePlan: profile.subscription.activePlan || 'STANDARD',
      planStatus: profile.subscription.planStatus || 'ACTIVE',
      membershipDays: Math.max(0, membershipDays)
    };

    // 9. Build Report
    const reportData: Omit<IPolicyEvaluationReport, 'evaluationId'> = {
      customerId: customer.customerId,
      evaluatedAt: evaluationDate,
      customerSummary,
      strategy,
      campaigns: {
        matchedActiveCampaigns: activeCampaigns.map((c) => ({
          campaignId: c._id.toString(),
          campaignCode: c.campaignCode,
          name: c.name,
          objective: c.objective,
          targetSegments: c.targetSegments,
          validUntil: c.endDate
        }))
      },
      offers: {
        eligibleOffers,
        ineligibleOffers
      },
      billing: billingEval,
      channelConsent,
      recommendation
    };

    // 10. Persist Snapshot for Audit Logging
    const savedDoc = await PolicyEvaluationModel.create(reportData);
    logger.info(`Generated and persisted policy evaluation for customer ${customer.customerId}`, 'PolicyEngineService');

    return {
      evaluationId: savedDoc._id.toString(),
      ...reportData
    };
  }

  /**
   * Retrieves the most recent policy evaluation for a customer.
   */
  static async getLatestEvaluation(customerIdOrId: string): Promise<IPolicyEvaluationReport | null> {
    const customer = await CustomerRepository.findByIdOrCustomerId(customerIdOrId);
    if (!customer) {
      throw new Error('CUSTOMER_NOT_FOUND');
    }

    const doc = await PolicyEvaluationModel.findOne({ customerId: customer.customerId })
      .sort({ evaluatedAt: -1 })
      .lean();

    if (!doc) {
      return null;
    }

    return {
      evaluationId: doc._id.toString(),
      customerId: doc.customerId,
      evaluatedAt: doc.evaluatedAt,
      customerSummary: doc.customerSummary,
      strategy: doc.strategy,
      campaigns: doc.campaigns,
      offers: doc.offers,
      billing: doc.billing,
      channelConsent: doc.channelConsent,
      recommendation: doc.recommendation
    };
  }
}

import { IOfferDocument } from './offers.model.js';
import { OfferStatus, OfferEligibilityResult, FailedEligibilityCondition } from './offers.types.js';
import { AssembledCustomerProfile } from '../customers/customer-profile.service.js';
import { ISegmentationResult } from '../segmentation/segmentation.types.js';
import { ClassificationStatus } from '../segmentation/segmentation.constants.js';

export class OfferEligibilityService {
  /**
   * Deterministically evaluates an offer against verified customer facts and segmentation results.
   */
  static evaluate(
    offer: IOfferDocument,
    profile: AssembledCustomerProfile,
    classification: ISegmentationResult | null,
    requestedChannel = 'EMAIL',
    evaluationDate: Date = new Date()
  ): OfferEligibilityResult {
    const passedConditions: string[] = [];
    const failedConditions: FailedEligibilityCondition[] = [];
    const reasonCodes: string[] = [];

    const { customer, subscription, communicationPreferences } = profile;
    const rules = offer.eligibilityRules || {};

    // 1. Data Sufficiency Check
    if (!classification || classification.classificationStatus === ClassificationStatus.INSUFFICIENT_DATA) {
      return {
        customerId: customer.customerId,
        offerId: offer._id.toString(),
        offerCode: offer.offerCode,
        eligible: false,
        status: 'INSUFFICIENT_DATA',
        reasonCodes: ['INSUFFICIENT_CLASSIFICATION_DATA'],
        passedConditions: [],
        failedConditions: [
          {
            rule: 'classificationStatus',
            required: 'CLASSIFIED',
            actual: classification ? classification.classificationStatus : 'MISSING',
            reason: 'Customer classification evidence is insufficient to reliably determine offer eligibility'
          }
        ],
        validatedAt: evaluationDate
      };
    }

    // 2. Offer Status & Time Validity Check
    if (offer.status !== OfferStatus.ACTIVE) {
      failedConditions.push({
        rule: 'offerStatus',
        required: OfferStatus.ACTIVE,
        actual: offer.status,
        reason: `Offer is currently ${offer.status.toLowerCase()} and cannot be recommended`
      });
      reasonCodes.push('OFFER_STATUS_INACTIVE');
    } else {
      passedConditions.push('Offer is ACTIVE');
    }

    const fromTime = new Date(offer.validFrom).getTime();
    const untilTime = new Date(offer.validUntil).getTime();
    const nowTime = evaluationDate.getTime();

    if (nowTime < fromTime || nowTime > untilTime) {
      failedConditions.push({
        rule: 'validityPeriod',
        required: `${new Date(offer.validFrom).toISOString().slice(0, 10)} to ${new Date(offer.validUntil).toISOString().slice(0, 10)}`,
        actual: evaluationDate.toISOString().slice(0, 10),
        reason: nowTime > untilTime ? 'Offer has expired' : 'Offer validity window has not started'
      });
      reasonCodes.push('OFFER_OUTSIDE_VALIDITY_WINDOW');
      reasonCodes.push(nowTime > untilTime ? 'OFFER_EXPIRED' : 'OFFER_NOT_STARTED');
    } else {
      passedConditions.push('Offer is within active validity date range');
    }

    // Redemption capacity check
    if (offer.maxRedemptions && offer.currentRedemptions >= offer.maxRedemptions) {
      failedConditions.push({
        rule: 'maxRedemptions',
        required: `< ${offer.maxRedemptions}`,
        actual: offer.currentRedemptions,
        reason: 'Offer has reached its maximum total redemption capacity'
      });
      reasonCodes.push('OFFER_CAPACITY_EXHAUSTED');
      reasonCodes.push('REDEMPTION_LIMIT_REACHED');
    } else {
      passedConditions.push('Offer redemption capacity available');
    }

    // 3. Segment Match Check
    const customerSegments = [
      ...(classification.primarySegment ? [classification.primarySegment] : []),
      ...(classification.segments || [])
    ];

    const hasMatchingSegment =
      !offer.targetSegments ||
      offer.targetSegments.length === 0 ||
      offer.targetSegments.some((target) => customerSegments.includes(target));

    if (!hasMatchingSegment) {
      failedConditions.push({
        rule: 'targetSegments',
        required: offer.targetSegments,
        actual: customerSegments,
        reason: 'Customer is not categorized in any of the offer target segments'
      });
      reasonCodes.push('SEGMENT_MISMATCH');
    } else {
      passedConditions.push('Customer matches required target segment');
      reasonCodes.push('SEGMENT_MATCH');
    }

    // 4. Loyalty Eligibility Check
    const minPoints = rules.minimumLoyaltyPoints ?? 0;
    if (minPoints > 0) {
      const actualPoints = customer.loyaltyPoints || 0;
      if (actualPoints < minPoints) {
        failedConditions.push({
          rule: 'minimumLoyaltyPoints',
          required: minPoints,
          actual: actualPoints,
          reason: `Customer loyalty points (${actualPoints}) are below the required threshold of ${minPoints}`
        });
        reasonCodes.push('INSUFFICIENT_LOYALTY_POINTS');
        reasonCodes.push('LOYALTY_POINTS_BELOW_THRESHOLD');
      } else {
        passedConditions.push(`Customer meets minimum loyalty points (${actualPoints} >= ${minPoints})`);
      }
    }

    const minTenureDays = rules.minimumMembershipDays ?? 0;
    if (minTenureDays > 0) {
      const evidenceRecord = classification.evidence as unknown as Record<string, unknown>;
      const actualTenure =
        (typeof evidenceRecord.membershipDurationDays === 'number' ? evidenceRecord.membershipDurationDays : undefined) ??
        (typeof evidenceRecord.tenureDays === 'number' ? (evidenceRecord.tenureDays as number) : undefined) ??
        (customer.membershipStartDate
          ? Math.floor((nowTime - new Date(customer.membershipStartDate).getTime()) / (1000 * 60 * 60 * 24))
          : 0);

      if (actualTenure < minTenureDays) {
        failedConditions.push({
          rule: 'minimumMembershipDays',
          required: minTenureDays,
          actual: actualTenure,
          reason: `Customer membership tenure (${actualTenure} days) is less than required ${minTenureDays} days`
        });
        reasonCodes.push('INSUFFICIENT_MEMBERSHIP_DURATION');
        reasonCodes.push('MEMBERSHIP_DURATION_BELOW_THRESHOLD');
      } else {
        passedConditions.push(`Customer tenure satisfies minimum requirement (${actualTenure}d >= ${minTenureDays}d)`);
      }
    }

    if (rules.requiredLoyaltyTiers && rules.requiredLoyaltyTiers.length > 0) {
      const tier = (customer.loyaltyTier || 'BRONZE').toUpperCase();
      if (!rules.requiredLoyaltyTiers.map((t) => t.toUpperCase()).includes(tier)) {
        failedConditions.push({
          rule: 'requiredLoyaltyTiers',
          required: rules.requiredLoyaltyTiers,
          actual: tier,
          reason: `Customer tier (${tier}) does not qualify for this offer tier restriction`
        });
        reasonCodes.push('DISALLOWED_LOYALTY_TIER');
        reasonCodes.push('TIER_NOT_ELIGIBLE');
      } else {
        passedConditions.push(`Customer loyalty tier (${tier}) qualifies`);
      }
    }

    // 5. Account & Plan Status Checks
    if (rules.requiredAccountStatus) {
      const reqStatus = rules.requiredAccountStatus.toUpperCase();
      const actualStatus = (customer.accountStatus || '').toUpperCase();
      if (actualStatus !== reqStatus) {
        failedConditions.push({
          rule: 'requiredAccountStatus',
          required: reqStatus,
          actual: actualStatus,
          reason: `Account status must be ${reqStatus}, but is currently ${actualStatus}`
        });
        reasonCodes.push('DISALLOWED_ACCOUNT_STATUS');
        reasonCodes.push('ACCOUNT_STATUS_INELIGIBLE');
      } else {
        passedConditions.push(`Account status is ${reqStatus}`);
      }
    }

    if (rules.requiredPlanStatus) {
      const reqPlanStatus = rules.requiredPlanStatus.toUpperCase();
      const actualPlanStatus = (subscription?.planStatus || '').toUpperCase();
      if (actualPlanStatus !== reqPlanStatus) {
        failedConditions.push({
          rule: 'requiredPlanStatus',
          required: reqPlanStatus,
          actual: actualPlanStatus,
          reason: `Subscription plan status must be ${reqPlanStatus}, but is ${actualPlanStatus || 'UNKNOWN'}`
        });
        reasonCodes.push('DISALLOWED_PLAN_STATUS');
        reasonCodes.push('PLAN_STATUS_INELIGIBLE');
      } else {
        passedConditions.push(`Subscription plan status is ${reqPlanStatus}`);
      }
    }

    if (rules.requiredPlanType) {
      const reqType = rules.requiredPlanType.toUpperCase();
      const actualType = (subscription?.planType || '').toUpperCase();
      if (actualType !== reqType) {
        failedConditions.push({
          rule: 'requiredPlanType',
          required: reqType,
          actual: actualType,
          reason: `Plan type must be ${reqType}, but is ${actualType || 'UNKNOWN'}`
        });
        reasonCodes.push('DISALLOWED_PLAN_TYPE');
        reasonCodes.push('PLAN_TYPE_INELIGIBLE');
      } else {
        passedConditions.push(`Plan type is ${reqType}`);
      }
    }

    // 6. Financial Restrictions (Cannot reward customers with past-due unpaid balances)
    const maxOverdue = rules.maxOverdueBalance;
    const profileOverdue = (profile.billing?.overdueInvoicesCount ?? 0) > 0 ? (profile.billing?.outstandingAmount ?? 0) : 0;
    const evidenceRecord = classification.evidence as unknown as Record<string, unknown>;
    const classificationOverdue =
      (typeof evidenceRecord.totalOutstandingAmount === 'number' && (classification.evidence.hasNonDisputedOverdue || (classification.evidence.overdueInvoiceCount ?? 0) > 0))
        ? (evidenceRecord.totalOutstandingAmount as number)
        : (typeof evidenceRecord.overdueAmount === 'number' ? (evidenceRecord.overdueAmount as number) : 0);
    const actualOverdue = Math.max(profileOverdue, classificationOverdue);

    if (maxOverdue !== undefined && actualOverdue > maxOverdue) {
      failedConditions.push({
        rule: 'maxOverdueBalance',
        required: maxOverdue,
        actual: actualOverdue,
        reason: `Customer has overdue balance of $${actualOverdue.toFixed(2)}, exceeding maximum allowed of $${maxOverdue}`
      });
      reasonCodes.push('OVERDUE_BALANCE_RESTRICTION');
      reasonCodes.push('OVERDUE_BILLING_RESTRICTION');
    } else {
      passedConditions.push('Customer has no disqualifying overdue billing balance');
    }

    // 7. Channel Eligibility & Consent Check
    const channel = requestedChannel.toUpperCase();
    const isChannelAllowed =
      !offer.allowedChannels ||
      offer.allowedChannels.length === 0 ||
      offer.allowedChannels.map((c) => c.toUpperCase()).includes(channel);

    if (!isChannelAllowed) {
      failedConditions.push({
        rule: 'allowedChannels',
        required: offer.allowedChannels,
        actual: channel,
        reason: `Requested communication channel '${channel}' is not permitted by this offer`
      });
      reasonCodes.push('CHANNEL_NOT_ALLOWED_BY_OFFER');
    } else {
      // Check customer consent
      const hasConsent =
        channel === 'EMAIL'
          ? communicationPreferences?.emailConsent
          : channel === 'SMS'
          ? communicationPreferences?.smsConsent
          : channel === 'WHATSAPP'
          ? communicationPreferences?.whatsappConsent
          : true;

      if (!hasConsent || communicationPreferences?.optedOut) {
        failedConditions.push({
          rule: 'communicationConsent',
          required: `Active consent for ${channel}`,
          actual: communicationPreferences?.optedOut ? 'OPTED_OUT' : 'NO_CONSENT',
          reason: communicationPreferences?.optedOut
            ? 'Customer has globally opted out of communications'
            : `Customer has not granted permission to receive communications via ${channel}`
        });
        reasonCodes.push('CHANNEL_CONSENT_MISSING');
        reasonCodes.push('NO_CHANNEL_CONSENT');
        if (communicationPreferences?.optedOut) {
          reasonCodes.push('CUSTOMER_OPTED_OUT');
        }
      } else {
        passedConditions.push(`Customer has verified consent for channel '${channel}'`);
      }
    }

    // 8. Outcome Assembly
    const isEligible = failedConditions.length === 0;

    if (isEligible) {
      reasonCodes.push('OFFER_ELIGIBLE');
    }

    return {
      customerId: customer.customerId,
      offerId: offer._id.toString(),
      offerCode: offer.offerCode,
      eligible: isEligible,
      status: isEligible ? 'ELIGIBLE' : 'INELIGIBLE',
      reasonCodes,
      passedConditions,
      failedConditions,
      validatedAt: evaluationDate
    };
  }
}

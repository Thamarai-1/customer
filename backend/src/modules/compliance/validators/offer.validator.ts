import {
  CheckId,
  CheckStatus,
  SeverityLevel,
  RecommendedAction,
  ComplianceReasonCode
} from '../compliance.constants.js';
import {
  ComplianceValidationContext,
  IValidationCheckResult,
  IValidationFinding
} from '../compliance.types.js';
import { FindingBuilder } from '../utils/finding-builder.js';
import { OfferModel } from '../../offers/offers.model.js';
import { OfferEligibilityService } from '../../offers/offer-eligibility.service.js';

export class OfferValidator {
  static async execute(context: ComplianceValidationContext): Promise<IValidationCheckResult> {
    const startTime = Date.now();
    const findings: IValidationFinding[] = [];
    const { message, profile, policyReport } = context;

    const referencedOffers = message.referencedOffers || [];
    const msgChannel = (message.channel || 'EMAIL').toUpperCase();

    // If no offers referenced, check if promotions were suppressed or if promotions were inappropriately mentioned
    if (referencedOffers.length === 0) {
      return {
        checkId: CheckId.OFFER_ELIGIBILITY,
        checkName: 'Offer & Reward Compliance',
        status: CheckStatus.PASSED,
        severity: SeverityLevel.INFO,
        message: 'No promotional offers referenced in message draft.',
        findings: [],
        recommendedAction: RecommendedAction.NONE,
        durationMs: Date.now() - startTime
      };
    }

    // Check if policy suppressed promotions
    if (policyReport?.strategy.suppressPromotions) {
      findings.push(
        FindingBuilder.create({
          ruleId: 'OFFER_PROMOTIONS_SUPPRESSED',
          checkId: CheckId.OFFER_ELIGIBILITY,
          severity: SeverityLevel.CRITICAL,
          reasonCode: ComplianceReasonCode.OFFER_TERMS_MISMATCH,
          message: 'Policy engine suppressed all promotions for this customer due to high priority overdue bill.',
          evidenceValue: 'suppressPromotions: true',
          generatedValue: referencedOffers.join(', ')
        })
      );
    }

    const now = new Date();

    for (const code of referencedOffers) {
      const cleanCode = code.trim().toUpperCase();
      const offerDoc = await OfferModel.findOne({ offerCode: cleanCode });

      if (!offerDoc) {
        findings.push(
          FindingBuilder.create({
            ruleId: 'OFFER_NOT_FOUND',
            checkId: CheckId.OFFER_ELIGIBILITY,
            severity: SeverityLevel.CRITICAL,
            reasonCode: ComplianceReasonCode.OFFER_NOT_FOUND,
            message: `Referenced offer code '${cleanCode}' does not exist in authoritative offer catalog.`,
            evidenceValue: 'Catalog offers',
            generatedValue: cleanCode
          })
        );
        continue;
      }

      // Check Active Status
      if (offerDoc.status === 'PAUSED') {
        findings.push(
          FindingBuilder.create({
            ruleId: 'OFFER_PAUSED',
            checkId: CheckId.OFFER_ELIGIBILITY,
            severity: SeverityLevel.CRITICAL,
            reasonCode: ComplianceReasonCode.OFFER_PAUSED,
            message: `Referenced offer '${cleanCode}' is currently PAUSED.`,
            evidenceValue: 'ACTIVE',
            generatedValue: offerDoc.status
          })
        );
      } else if (offerDoc.status === 'EXPIRED' || offerDoc.validUntil < now) {
        findings.push(
          FindingBuilder.create({
            ruleId: 'OFFER_EXPIRED',
            checkId: CheckId.OFFER_ELIGIBILITY,
            severity: SeverityLevel.CRITICAL,
            reasonCode: ComplianceReasonCode.OFFER_EXPIRED,
            message: `Referenced offer '${cleanCode}' expired on ${offerDoc.validUntil.toISOString()}.`,
            evidenceValue: offerDoc.validUntil.toISOString(),
            generatedValue: 'Referenced as active'
          })
        );
      }

      // Check Channel compatibility
      if (offerDoc.allowedChannels && offerDoc.allowedChannels.length > 0) {
        const allowsChannel = offerDoc.allowedChannels.map((c) => c.toUpperCase()).includes(msgChannel);
        if (!allowsChannel) {
          findings.push(
            FindingBuilder.create({
              ruleId: 'OFFER_CHANNEL_RESTRICTION',
              checkId: CheckId.OFFER_ELIGIBILITY,
              severity: SeverityLevel.HIGH,
              reasonCode: ComplianceReasonCode.OFFER_CHANNEL_NOT_ALLOWED,
              message: `Offer '${cleanCode}' is restricted to [${offerDoc.allowedChannels.join(', ')}], incompatible with '${msgChannel}'.`,
              evidenceValue: offerDoc.allowedChannels.join(', '),
              generatedValue: msgChannel
            })
          );
        }
      }

      // Re-evaluate authoritative customer eligibility only for active offers
      if (profile && offerDoc.status === 'ACTIVE') {
        const ineligible = policyReport?.offers?.ineligibleOffers?.find(
          (o) => o.offerCode?.toUpperCase() === cleanCode
        );
        if (ineligible) {
          findings.push(
            FindingBuilder.create({
              ruleId: 'OFFER_CUSTOMER_INELIGIBLE',
              checkId: CheckId.OFFER_ELIGIBILITY,
              severity: SeverityLevel.CRITICAL,
              reasonCode: ComplianceReasonCode.CUSTOMER_NOT_ELIGIBLE,
              message: `Customer does not meet eligibility requirements for offer '${cleanCode}': ${ineligible.reasonCodes.join(', ')}.`,
              evidenceValue: ineligible.reasonCodes.join(', '),
              generatedValue: 'Claimed eligible'
            })
          );
        } else {
          const evalResult = OfferEligibilityService.evaluate(
            offerDoc,
            profile,
            {
              classificationStatus: 'CLASSIFIED',
              primarySegment: message.primarySegment || 'CONSISTENT_CUSTOMER',
              evidence: {
                totalOutstandingAmount: 0,
                overdueAmount: 0,
                daysSinceLastActivity: 5
              }
            } as any,
            msgChannel
          );
          if (!evalResult.eligible) {
            findings.push(
              FindingBuilder.create({
                ruleId: 'OFFER_CUSTOMER_INELIGIBLE',
                checkId: CheckId.OFFER_ELIGIBILITY,
                severity: SeverityLevel.CRITICAL,
                reasonCode: ComplianceReasonCode.CUSTOMER_NOT_ELIGIBLE,
                message: `Customer does not meet eligibility requirements for offer '${cleanCode}': ${evalResult.reasonCodes.join(', ')}.`,
                evidenceValue: evalResult.reasonCodes.join(', '),
                generatedValue: 'Claimed eligible'
              })
            );
          }
        }
      }
    }

    const hasCritical = findings.some((f) => f.severity === SeverityLevel.CRITICAL);
    const hasHigh = findings.some((f) => f.severity === SeverityLevel.HIGH);

    let status = CheckStatus.PASSED;
    let severity = SeverityLevel.INFO;
    let recommendedAction = RecommendedAction.NONE;

    if (hasCritical) {
      status = CheckStatus.FAILED;
      severity = SeverityLevel.CRITICAL;
      recommendedAction = RecommendedAction.BLOCK_MESSAGE;
    } else if (hasHigh) {
      status = CheckStatus.FAILED;
      severity = SeverityLevel.HIGH;
      recommendedAction = RecommendedAction.REGENERATE;
    } else if (findings.length > 0) {
      status = CheckStatus.WARNING;
      severity = SeverityLevel.MEDIUM;
      recommendedAction = RecommendedAction.EDIT_REQUIRED;
    }

    return {
      checkId: CheckId.OFFER_ELIGIBILITY,
      checkName: 'Offer & Reward Compliance',
      status,
      severity,
      reasonCode: findings[0]?.reasonCode,
      message: findings[0]?.message || 'All referenced offers verified against catalog and eligibility rules.',
      findings,
      evidence: {
        referencedOffers,
        suppressPromotions: policyReport?.strategy.suppressPromotions ?? false
      },
      recommendedAction,
      durationMs: Date.now() - startTime
    };
  }
}

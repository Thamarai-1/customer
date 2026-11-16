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
import { TextNormalizer } from '../utils/text-normalizer.js';
import { DEFAULT_REQUIRED_DISCLAIMERS } from '../rules/required-disclaimers.js';

export class DisclaimerValidator {
  static async execute(context: ComplianceValidationContext): Promise<IValidationCheckResult> {
    const startTime = Date.now();
    const findings: IValidationFinding[] = [];
    const { message, config } = context;

    const disclaimers = config?.requiredDisclaimers || DEFAULT_REQUIRED_DISCLAIMERS;
    const text = `${message.subject} ${message.body}`;
    const normalized = TextNormalizer.normalize(text);

    const hasOffers = message.referencedOffers && message.referencedOffers.length > 0;
    const isBilling =
      message.objective?.includes('PAYMENT') ||
      message.primarySegment === 'OVERDUE_BILL';

    // 1. Promotional Offer Disclaimer
    if (hasOffers) {
      const hasTerms =
        normalized.includes('terms') ||
        normalized.includes('conditions') ||
        normalized.includes('promo code') ||
        normalized.includes('checkout');

      if (!hasTerms) {
        findings.push(
          FindingBuilder.create({
            ruleId: 'DISCLAIMER_OFFER_TERMS_MISSING',
            checkId: CheckId.REQUIRED_DISCLAIMERS,
            severity: SeverityLevel.MEDIUM,
            reasonCode: ComplianceReasonCode.REQUIRED_TERMS_MISSING,
            message: 'Promotional offer draft is missing required terms & conditions disclaimer.',
            evidenceValue: disclaimers.offerTermsText,
            generatedValue: 'Missing terms'
          })
        );
      }
    }

    // 2. Billing Disregard / Support Disclaimer
    if (isBilling) {
      const hasDisregard =
        normalized.includes('disregard') ||
        normalized.includes('already been sent') ||
        normalized.includes('already paid');

      if (!hasDisregard) {
        findings.push(
          FindingBuilder.create({
            ruleId: 'DISCLAIMER_BILLING_DISPUTE_MISSING',
            checkId: CheckId.REQUIRED_DISCLAIMERS,
            severity: SeverityLevel.MEDIUM,
            reasonCode: ComplianceReasonCode.DISPUTE_INSTRUCTIONS_MISSING,
            message: 'Billing reminder is missing mandatory disregard instructions for payments already in transit.',
            evidenceValue: disclaimers.billingDisputeText,
            generatedValue: 'Missing disregard notice'
          })
        );
      }
    }

    const hasMedium = findings.some((f) => f.severity === SeverityLevel.MEDIUM);

    return {
      checkId: CheckId.REQUIRED_DISCLAIMERS,
      checkName: 'Required Disclaimers Validation',
      status: hasMedium ? CheckStatus.FAILED : CheckStatus.PASSED,
      severity: hasMedium ? SeverityLevel.MEDIUM : SeverityLevel.INFO,
      reasonCode: findings[0]?.reasonCode,
      message: findings[0]?.message || 'All mandatory policy disclaimers are present.',
      findings,
      evidence: {
        hasOffers,
        isBilling
      },
      recommendedAction: hasMedium ? RecommendedAction.EDIT_REQUIRED : RecommendedAction.NONE,
      durationMs: Date.now() - startTime
    };
  }
}

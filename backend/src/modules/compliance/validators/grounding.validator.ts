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
import { EvidenceExtractor } from '../utils/evidence-extractor.js';

export class GroundingValidator {
  static async execute(context: ComplianceValidationContext): Promise<IValidationCheckResult> {
    const startTime = Date.now();
    const findings: IValidationFinding[] = [];
    const { message, customer, profile, latestOffers, latestBillingRecords } = context;

    if (!customer || !profile) {
      return {
        checkId: CheckId.FACTUAL_GROUNDING,
        checkName: 'Factual Grounding Validation',
        status: CheckStatus.INSUFFICIENT_DATA,
        severity: SeverityLevel.HIGH,
        reasonCode: ComplianceReasonCode.INSUFFICIENT_EVIDENCE,
        message: 'Verified customer context is missing; cannot validate factual claims',
        findings: [
          FindingBuilder.create({
            ruleId: 'GROUNDING_EVIDENCE_MISSING',
            checkId: CheckId.FACTUAL_GROUNDING,
            severity: SeverityLevel.HIGH,
            reasonCode: ComplianceReasonCode.INSUFFICIENT_EVIDENCE,
            message: 'Customer profile could not be retrieved from verified source database.'
          })
        ],
        recommendedAction: RecommendedAction.ESCALATE_TO_HUMAN,
        durationMs: Date.now() - startTime
      };
    }

    const text = `${message.subject} ${message.body}`;

    // 1. Customer Name Check
    if (customer.firstName) {
      const dearMatch = text.match(/dear\s+([a-zA-Z]+)/i);
      if (dearMatch && dearMatch[1]) {
        const addressed = dearMatch[1].trim().toLowerCase();
        const expected = customer.firstName.trim().toLowerCase();
        if (addressed !== expected && addressed !== 'customer' && addressed !== 'member') {
          findings.push(
            FindingBuilder.create({
              ruleId: 'GROUNDING_NAME_MISMATCH',
              checkId: CheckId.FACTUAL_GROUNDING,
              severity: SeverityLevel.HIGH,
              reasonCode: ComplianceReasonCode.INCORRECT_CUSTOMER_NAME,
              message: `Addressed as '${dearMatch[1]}', expected '${customer.firstName}'`,
              evidenceValue: customer.firstName,
              generatedValue: dearMatch[1]
            })
          );
        }
      }
    }

    // 2. Numerical Discount Claim Check
    const mentionedPercentages = EvidenceExtractor.extractPercentages(text);
    const maxApprovedDiscount = Math.max(
      0,
      ...latestOffers.map((o) => (o.valueType === 'PERCENTAGE' ? o.value : 0))
    );

    for (const pct of mentionedPercentages) {
      if (latestOffers.length === 0) {
        findings.push(
          FindingBuilder.create({
            ruleId: 'GROUNDING_UNAPPROVED_DISCOUNT',
            checkId: CheckId.FACTUAL_GROUNDING,
            severity: SeverityLevel.CRITICAL,
            reasonCode: ComplianceReasonCode.UNSUPPORTED_NUMERICAL_CLAIM,
            message: `Message claims a ${pct}% discount, but customer has no approved active offers.`,
            evidenceValue: '0%',
            generatedValue: `${pct}%`
          })
        );
      } else if (pct > maxApprovedDiscount) {
        findings.push(
          FindingBuilder.create({
            ruleId: 'GROUNDING_EXCESSIVE_DISCOUNT',
            checkId: CheckId.FACTUAL_GROUNDING,
            severity: SeverityLevel.CRITICAL,
            reasonCode: ComplianceReasonCode.UNSUPPORTED_NUMERICAL_CLAIM,
            message: `Message claims a ${pct}% discount, exceeding maximum approved offer value of ${maxApprovedDiscount}%.`,
            evidenceValue: `${maxApprovedDiscount}%`,
            generatedValue: `${pct}%`
          })
        );
      }
    }

    // 3. Billing Numerical Claim Check
    if (latestBillingRecords && latestBillingRecords.length > 0) {
      const overdueInvoices = latestBillingRecords.filter((b) => b.paymentStatus === 'OVERDUE');
      const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (inv.outstandingAmount ?? inv.invoiceAmount), 0);
      const currencyAmounts = EvidenceExtractor.extractCurrencyAmounts(text);

      for (const amt of currencyAmounts) {
        // If amount differs from total overdue and any single invoice amount
        const matchesAnyInvoice = latestBillingRecords.some(
          (b) => Math.abs((b.outstandingAmount ?? b.invoiceAmount) - amt) < 0.05
        );
        const matchesTotalOverdue = Math.abs(totalOverdue - amt) < 0.05;

        // Only flag if in billing follow-up context and does not match any verified invoice
        if (!matchesAnyInvoice && !matchesTotalOverdue && overdueInvoices.length > 0) {
          findings.push(
            FindingBuilder.create({
              ruleId: 'GROUNDING_BILLING_AMOUNT_MISMATCH',
              checkId: CheckId.FACTUAL_GROUNDING,
              severity: SeverityLevel.CRITICAL,
              reasonCode: ComplianceReasonCode.UNSUPPORTED_NUMERICAL_CLAIM,
              message: `Message cites an unverified financial amount of $${amt.toFixed(2)}.`,
              evidenceValue: `$${totalOverdue.toFixed(2)}`,
              generatedValue: `$${amt.toFixed(2)}`
            })
          );
        }
      }
    }

    const hasCritical = findings.some((f) => f.severity === SeverityLevel.CRITICAL);
    const hasHigh = findings.some((f) => f.severity === SeverityLevel.HIGH);
    const hasMedium = findings.some((f) => f.severity === SeverityLevel.MEDIUM);

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
    } else if (hasMedium) {
      status = CheckStatus.FAILED;
      severity = SeverityLevel.MEDIUM;
      recommendedAction = RecommendedAction.EDIT_REQUIRED;
    } else if (findings.length > 0) {
      status = CheckStatus.WARNING;
      severity = SeverityLevel.LOW;
      recommendedAction = RecommendedAction.REVIEW_REQUIRED;
    }

    return {
      checkId: CheckId.FACTUAL_GROUNDING,
      checkName: 'Factual Grounding Validation',
      status,
      severity,
      reasonCode: findings[0]?.reasonCode,
      message: findings[0]?.message || 'All factual claims verified against source data.',
      findings,
      evidence: {
        customerName: customer.firstName,
        activePlan: profile.subscription?.activePlan,
        loyaltyTier: customer.loyaltyInfo?.loyaltyTier
      },
      recommendedAction,
      durationMs: Date.now() - startTime
    };
  }
}

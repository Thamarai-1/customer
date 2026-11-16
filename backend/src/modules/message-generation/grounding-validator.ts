import {
  IGeneratedEmailStructured,
  IEvidenceContext,
  GroundingValidationResult,
  IGroundingFinding
} from './message-generation.types.js';
import { GroundingStatus } from './message-generation.constants.js';

export class GroundingValidator {
  /**
   * Deterministically validates that claims in the generated message are strictly grounded in supplied evidence.
   */
  static validate(
    message: IGeneratedEmailStructured,
    evidence: IEvidenceContext
  ): GroundingValidationResult {
    const findings: IGroundingFinding[] = [];
    const body = message.body || '';
    const subject = message.subject || '';
    const textToScan = `${subject} ${body}`.toLowerCase();

    // 1. Offer Code Grounding
    const eligibleOfferCodes = (evidence.eligibleOffers || []).map((o) => o.offerCode.toUpperCase());
    const eligibleOfferCodeSet = new Set(eligibleOfferCodes);

    // Check referencedOffers from structured output
    for (const refOffer of message.referencedOffers || []) {
      const code = refOffer.trim().toUpperCase();
      if (!eligibleOfferCodeSet.has(code)) {
        findings.push({
          rule: 'unapprovedOfferReferenced',
          severity: 'ERROR',
          message: `Referenced offer code '${code}' is not among approved eligible offers`,
          evidenceValue: eligibleOfferCodes.join(', ') || 'None',
          generatedValue: code
        });
      }
    }

    // Scan text for regex pattern of offer codes (e.g., OFFER-XYZ)
    const offerCodeRegex = /\bOFFER-[A-Z0-9-]+\b/gi;
    const matchedOfferCodes = (body.match(offerCodeRegex) || []).map((c) => c.toUpperCase());
    for (const code of matchedOfferCodes) {
      if (!eligibleOfferCodeSet.has(code)) {
        findings.push({
          rule: 'inventedOfferCodeInBody',
          severity: 'ERROR',
          message: `Generated message mentions unapproved offer code '${code}' in text`,
          evidenceValue: eligibleOfferCodes.join(', ') || 'None',
          generatedValue: code
        });
      }
    }

    // 2. Offer Value Grounding
    // If eligible offers exist, verify that discounts or point numbers mentioned do not exceed actual offer values
    if (evidence.eligibleOffers.length > 0) {
      for (const offer of evidence.eligibleOffers) {
        if (offer.offerType === 'PERCENTAGE_DISCOUNT') {
          // Look for percentages like "60%" or "75%"
          const percentRegex = /(\d+)\s*%/g;
          let match: RegExpExecArray | null;
          while ((match = percentRegex.exec(body)) !== null) {
            const val = parseInt(match[1] || '0', 10);
            if (val > offer.value) {
              findings.push({
                rule: 'unsupportedDiscountPercentage',
                severity: 'ERROR',
                message: `Message claims a discount of ${val}%, which exceeds approved offer value of ${offer.value}%`,
                evidenceValue: `${offer.value}%`,
                generatedValue: `${val}%`
              });
            }
          }
        }
      }
    } else {
      // If eligibleOffers is empty, verify no discount percentages or offer rewards are promised
      const percentRegex = /(\d+)\s*%/g;
      if (percentRegex.test(body)) {
        findings.push({
          rule: 'unapprovedDiscountWithNoOffer',
          severity: 'ERROR',
          message: 'Message mentions a discount percentage, but no approved eligible offers exist in evidence',
          evidenceValue: 'No eligible offers',
          generatedValue: 'Discount percentage detected'
        });
      }
    }

    // 3. Billing Facts Grounding
    if (evidence.billing && Object.keys(evidence.billing.totalOverdueByCurrency || {}).length > 0) {
      const currency = (evidence.billing.primaryCurrency || 'USD').toUpperCase();
      const actualOverdue = evidence.billing.totalOverdueByCurrency[currency] ?? 0;

      // Extract currency amounts from text (e.g. $180, $180.00, USD 180)
      const amountRegex = /(?:\$|usd\s*|eur\s*|gbp\s*)(\d+(?:\.\d{2})?)/gi;
      let amountMatch: RegExpExecArray | null;
      while ((amountMatch = amountRegex.exec(body)) !== null) {
        const foundAmount = parseFloat(amountMatch[1] || '0');
        // If an amount is cited in billing context, it should match the verified overdue or outstanding amount
        const actualOutstanding = evidence.billing.totalOutstandingByCurrency[currency] ?? actualOverdue;
        const isMatch = Math.abs(foundAmount - actualOverdue) < 0.01 || Math.abs(foundAmount - actualOutstanding) < 0.01;
        if (!isMatch && foundAmount > 0) {
          findings.push({
            rule: 'incorrectBillingAmount',
            severity: 'ERROR',
            message: `Message states billing amount ${foundAmount}, which differs from verified overdue of ${actualOverdue.toFixed(2)}`,
            evidenceValue: `${currency} ${actualOverdue.toFixed(2)}`,
            generatedValue: String(foundAmount)
          });
        }
      }

      // Check for forbidden late penalties or threat phrases
      const forbiddenPhrases = [
        'late fee penalty',
        'interest charge of',
        'legal proceedings',
        'credit bureau reporting',
        'police',
        'court'
      ];
      for (const phrase of forbiddenPhrases) {
        if (textToScan.includes(phrase)) {
          findings.push({
            rule: 'inventedPenaltyOrConsequence',
            severity: 'ERROR',
            message: `Message contains unapproved coercive or penalty language: '${phrase}'`,
            evidenceValue: 'No penalty or legal action authorized',
            generatedValue: phrase
          });
        }
      }

      // If active dispute, ensure message does not demand immediate payment as undisputed debt
      if (evidence.billing.hasDispute && (textToScan.includes('pay immediately') || textToScan.includes('final warning'))) {
        findings.push({
          rule: 'disputedDebtMisrepresentation',
          severity: 'ERROR',
          message: 'Customer has an active dispute under review; message must not demand immediate payment or issue final warnings',
          evidenceValue: 'Active dispute under review',
          generatedValue: 'Aggressive demand for disputed balance'
        });
      }
    }

    // 4. Customer Name Grounding
    if (evidence.customer.firstName) {
      // If customer first name is available, check that any "Dear [Name]" doesn't invent a wrong name
      const dearMatch = body.match(/dear\s+([a-z]+)/i);
      if (dearMatch && dearMatch[1]) {
        const addressedName = dearMatch[1].toLowerCase();
        const expectedName = evidence.customer.firstName.toLowerCase();
        if (addressedName !== expectedName && addressedName !== 'customer' && addressedName !== 'member') {
          findings.push({
            rule: 'incorrectCustomerName',
            severity: 'WARNING',
            message: `Customer addressed as '${dearMatch[1]}', expected '${evidence.customer.firstName}'`,
            evidenceValue: evidence.customer.firstName,
            generatedValue: dearMatch[1]
          });
        }
      }
    }

    const hasErrors = findings.some((f) => f.severity === 'ERROR');
    const hasWarnings = findings.some((f) => f.severity === 'WARNING');

    let status: GroundingStatus = GroundingStatus.PASSED;
    if (hasErrors) {
      status = GroundingStatus.FAILED;
    } else if (hasWarnings) {
      status = GroundingStatus.FLAGGED;
    }

    return {
      status,
      isGrounded: !hasErrors,
      findings,
      validatedAt: new Date()
    };
  }
}

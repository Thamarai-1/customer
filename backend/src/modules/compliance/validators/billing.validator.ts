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
import { EvidenceExtractor } from '../utils/evidence-extractor.js';

export class BillingValidator {
  static async execute(context: ComplianceValidationContext): Promise<IValidationCheckResult> {
    const startTime = Date.now();
    const findings: IValidationFinding[] = [];
    const { message, latestBillingRecords } = context;

    const isBillingMessage =
      message.objective?.includes('PAYMENT') ||
      message.primarySegment === 'OVERDUE_BILL' ||
      message.subject.toLowerCase().includes('invoice') ||
      message.subject.toLowerCase().includes('payment') ||
      message.subject.toLowerCase().includes('balance');

    // If not a billing message, ensure no unapproved financial claims exist
    if (!isBillingMessage) {
      return {
        checkId: CheckId.BILLING_COMPLIANCE,
        checkName: 'Billing & Payment Compliance',
        status: CheckStatus.PASSED,
        severity: SeverityLevel.INFO,
        message: 'Non-billing communication; no financial enforcement checks required.',
        findings: [],
        recommendedAction: RecommendedAction.NONE,
        durationMs: Date.now() - startTime
      };
    }

    const text = `${message.subject} ${message.body}`;
    const normalized = TextNormalizer.normalize(text);

    // If customer has no billing records at all
    if (!latestBillingRecords || latestBillingRecords.length === 0) {
      findings.push(
        FindingBuilder.create({
          ruleId: 'BILLING_NO_RECORDS',
          checkId: CheckId.BILLING_COMPLIANCE,
          severity: SeverityLevel.CRITICAL,
          reasonCode: ComplianceReasonCode.BILLING_EVIDENCE_MISSING,
          message: 'Message demands payment, but customer has no verified billing records in the database.',
          evidenceValue: '0 records',
          generatedValue: 'Payment notice'
        })
      );
    } else {
      const overdueInvoices = latestBillingRecords.filter(
        (b) => b.paymentStatus === 'OVERDUE' && (b.outstandingAmount ?? b.invoiceAmount) > 0
      );

      // Rule 1: Paid Invoices must not be chased
      const totalOverdue = overdueInvoices.reduce(
        (sum, inv) => sum + (inv.outstandingAmount ?? inv.invoiceAmount),
        0
      );

      if (totalOverdue <= 0 || overdueInvoices.length === 0) {
        findings.push(
          FindingBuilder.create({
            ruleId: 'BILLING_INVOICE_ALREADY_PAID',
            checkId: CheckId.BILLING_COMPLIANCE,
            severity: SeverityLevel.CRITICAL,
            reasonCode: ComplianceReasonCode.INVOICE_ALREADY_PAID,
            message: 'All customer invoices are fully paid with $0 overdue balance. Payment reminder is outdated.',
            evidenceValue: 'Overdue: $0.00',
            generatedValue: 'Demanding payment'
          })
        );
      }

      // Rule 2: Amount Mismatch
      const currencyAmounts = EvidenceExtractor.extractCurrencyAmounts(text);
      for (const amt of currencyAmounts) {
        const matchesAnyInvoice = overdueInvoices.some(
          (b) => Math.abs((b.outstandingAmount ?? b.invoiceAmount) - amt) < 0.05
        );
        const matchesTotal = Math.abs(totalOverdue - amt) < 0.05;

        if (!matchesAnyInvoice && !matchesTotal && amt > 0) {
          findings.push(
            FindingBuilder.create({
              ruleId: 'BILLING_AMOUNT_MISMATCH',
              checkId: CheckId.BILLING_COMPLIANCE,
              severity: SeverityLevel.HIGH,
              reasonCode: ComplianceReasonCode.BILLING_AMOUNT_MISMATCH,
              message: `Message states $${amt.toFixed(2)}, which differs from verified overdue amount of $${totalOverdue.toFixed(2)}.`,
              evidenceValue: `$${totalOverdue.toFixed(2)}`,
              generatedValue: `$${amt.toFixed(2)}`
            })
          );
        }
      }

      // Rule 3: Active Dispute Protection
      const disputedInvoices = latestBillingRecords.filter(
        (b) => (b.disputeStatus && b.disputeStatus !== 'NONE' && b.disputeStatus !== 'RESOLVED') || (b.invoiceStatus as string) === 'DISPUTED'
      );
      if (disputedInvoices.length > 0) {
        findings.push(
          FindingBuilder.create({
            ruleId: 'BILLING_DISPUTE_COERCION',
            checkId: CheckId.BILLING_COMPLIANCE,
            severity: SeverityLevel.CRITICAL,
            reasonCode: ComplianceReasonCode.DISPUTED_INVOICE,
            message: 'Invoice is under active dispute; demanding payment is prohibited until dispute resolution.',
            evidenceValue: 'Active dispute',
            generatedValue: 'Demanding payment'
          })
        );
      }

      // Rule 4: Unapproved financial/late fee threats
      const forbiddenFinancialPhrases = [
        'late fee penalty of',
        'interest fee penalty',
        'legal proceedings',
        'court proceedings',
        'law enforcement',
        'police report'
      ];
      for (const phrase of forbiddenFinancialPhrases) {
        if (normalized.includes(phrase)) {
          findings.push(
            FindingBuilder.create({
              ruleId: 'BILLING_UNAPPROVED_PENALTY',
              checkId: CheckId.BILLING_COMPLIANCE,
              severity: SeverityLevel.CRITICAL,
              reasonCode: ComplianceReasonCode.UNAPPROVED_FINANCIAL_CLAIM,
              message: `Message contains unapproved penalty or legal threat language: '${phrase}'.`,
              evidenceValue: 'No legal threats permitted',
              generatedValue: phrase
            })
          );
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
      checkId: CheckId.BILLING_COMPLIANCE,
      checkName: 'Billing & Payment Compliance',
      status,
      severity,
      reasonCode: findings[0]?.reasonCode,
      message: findings[0]?.message || 'Billing claims strictly match verified invoice records.',
      findings,
      evidence: {
        isBillingMessage,
        invoicesCount: latestBillingRecords?.length ?? 0
      },
      recommendedAction,
      durationMs: Date.now() - startTime
    };
  }
}

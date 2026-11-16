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

export class ContentPolicyValidator {
  static async execute(context: ComplianceValidationContext): Promise<IValidationCheckResult> {
    const startTime = Date.now();
    const findings: IValidationFinding[] = [];
    const { message } = context;

    const text = `${message.subject} ${message.body}`;
    const normalized = TextNormalizer.normalize(text);

    // 1. Unsupported Guarantees
    const forbiddenGuarantees = [
      'guaranteed profit',
      'guaranteed return',
      '100% free forever',
      'unlimited free service',
      'lifetime warranty without conditions'
    ];
    for (const g of forbiddenGuarantees) {
      if (normalized.includes(g)) {
        findings.push(
          FindingBuilder.create({
            ruleId: 'CONTENT_UNSUPPORTED_GUARANTEE',
            checkId: CheckId.CONTENT_POLICY,
            severity: SeverityLevel.HIGH,
            reasonCode: ComplianceReasonCode.UNSUPPORTED_GUARANTEE,
            message: `Message makes an unauthorized commercial guarantee: '${g}'.`,
            evidenceValue: 'Corporate warranty policy',
            generatedValue: g
          })
        );
      }
    }

    // 2. Discriminatory Content
    const discriminatoryWords = ['incompetent', 'delinquent deadbeat', 'untrustworthy customer'];
    for (const d of discriminatoryWords) {
      if (normalized.includes(d)) {
        findings.push(
          FindingBuilder.create({
            ruleId: 'CONTENT_DISCRIMINATORY',
            checkId: CheckId.CONTENT_POLICY,
            severity: SeverityLevel.CRITICAL,
            reasonCode: ComplianceReasonCode.DISCRIMINATORY_CONTENT,
            message: `Message contains derogatory or discriminatory language: '${d}'.`,
            evidenceValue: 'Non-discrimination policy',
            generatedValue: d
          })
        );
      }
    }

    const hasCritical = findings.some((f) => f.severity === SeverityLevel.CRITICAL);
    const hasHigh = findings.some((f) => f.severity === SeverityLevel.HIGH);

    return {
      checkId: CheckId.CONTENT_POLICY,
      checkName: 'Content Policy & General Safety',
      status: hasCritical || hasHigh ? CheckStatus.FAILED : CheckStatus.PASSED,
      severity: hasCritical ? SeverityLevel.CRITICAL : hasHigh ? SeverityLevel.HIGH : SeverityLevel.INFO,
      reasonCode: findings[0]?.reasonCode,
      message: findings[0]?.message || 'Content conforms to general corporate policy guidelines.',
      findings,
      evidence: {},
      recommendedAction: hasCritical
        ? RecommendedAction.BLOCK_MESSAGE
        : hasHigh
        ? RecommendedAction.REGENERATE
        : RecommendedAction.NONE,
      durationMs: Date.now() - startTime
    };
  }
}

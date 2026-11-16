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
import { DEFAULT_BLOCKED_PHRASES } from '../rules/blocked-phrases.js';
import { StrategyObjective } from '../../strategies/strategies.types.js';

export class LanguageValidator {
  static async execute(context: ComplianceValidationContext): Promise<IValidationCheckResult> {
    const startTime = Date.now();
    const findings: IValidationFinding[] = [];
    const { message, config, policyReport } = context;

    const blockedList = config?.blockedPhrases || DEFAULT_BLOCKED_PHRASES;
    const text = `${message.subject} ${message.body}`;
    const normalized = TextNormalizer.normalize(text);

    // 1. Prohibited phrases check
    for (const phrase of blockedList) {
      const normalizedPhrase = phrase.toLowerCase().trim();
      if (normalized.includes(normalizedPhrase)) {
        const isThreat =
          normalizedPhrase.includes('legal') ||
          normalizedPhrase.includes('police') ||
          normalizedPhrase.includes('court') ||
          normalizedPhrase.includes('warrant') ||
          normalizedPhrase.includes('penalty');

        const isManipulative =
          normalizedPhrase.includes('only 1 left') ||
          normalizedPhrase.includes('expires in 5') ||
          normalizedPhrase.includes('guaranteed');

        const reasonCode = isThreat
          ? ComplianceReasonCode.THREATENING_LANGUAGE
          : isManipulative
          ? ComplianceReasonCode.MANIPULATIVE_URGENCY
          : ComplianceReasonCode.PROHIBITED_LANGUAGE;

        findings.push(
          FindingBuilder.create({
            ruleId: 'LANGUAGE_PROHIBITED_PHRASE',
            checkId: CheckId.LANGUAGE_SAFETY,
            severity: isThreat ? SeverityLevel.CRITICAL : SeverityLevel.HIGH,
            reasonCode,
            message: `Message contains prohibited or non-compliant phrase: '${phrase}'.`,
            evidenceValue: 'Prohibited keyword list',
            generatedValue: phrase
          })
        );
      }
    }

    // 2. Tone consistency with strategy
    if (policyReport?.strategy) {
      const obj = policyReport.strategy.primaryObjective;
      if (obj === StrategyObjective.LOYALTY_RECOGNITION || obj === StrategyObjective.RELATIONSHIP_NURTURE) {
        const hasWarning =
          normalized.includes('warning') ||
          normalized.includes('overdue') ||
          normalized.includes('urgent action required');
        if (hasWarning) {
          findings.push(
            FindingBuilder.create({
              ruleId: 'LANGUAGE_TONE_MISMATCH',
              checkId: CheckId.LANGUAGE_SAFETY,
              severity: SeverityLevel.HIGH,
              reasonCode: ComplianceReasonCode.TONE_MISMATCH,
              message: `Appreciation message inappropriately contains warning/coercive tone language.`,
              evidenceValue: 'WARM_APPRECIATIVE',
              generatedValue: 'Urgent/Warning phrases'
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
      checkId: CheckId.LANGUAGE_SAFETY,
      checkName: 'Language & Content Safety',
      status,
      severity,
      reasonCode: findings[0]?.reasonCode,
      message: findings[0]?.message || 'Language complies with corporate safety standards.',
      findings,
      evidence: {
        inspectedLength: text.length
      },
      recommendedAction,
      durationMs: Date.now() - startTime
    };
  }
}

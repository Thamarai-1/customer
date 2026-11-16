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

export class DuplicateValidator {
  static async execute(context: ComplianceValidationContext): Promise<IValidationCheckResult> {
    const startTime = Date.now();
    const findings: IValidationFinding[] = [];
    const { message, communicationHistory, config } = context;

    const windowHours = config?.duplicateWindowHours ?? 72;
    const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const candidateSubject = TextNormalizer.canonicalize(message.subject);
    const candidateChannel = (message.channel || 'EMAIL').toUpperCase();

    // Check communication history within duplicate window
    for (const record of communicationHistory || []) {
      if (new Date(record.sentAt) < windowStart) continue;

      const recordChannel = (record.channel || 'EMAIL').toUpperCase();
      if (recordChannel !== candidateChannel) continue;

      // Exact or near-identical subject check
      const historySubject = TextNormalizer.canonicalize(record.subject);
      const isSameSubject = candidateSubject === historySubject;

      // Same campaign check
      const isSameCampaign =
        message.campaignRef &&
        record.campaignRef &&
        message.campaignRef.toString() === record.campaignRef.toString();

      if (isSameSubject || isSameCampaign) {
        findings.push(
          FindingBuilder.create({
            ruleId: 'DUPLICATE_RECENT_OUTREACH',
            checkId: CheckId.DUPLICATE_OUTREACH,
            severity: SeverityLevel.HIGH,
            reasonCode: ComplianceReasonCode.DUPLICATE_OUTREACH_DETECTED,
            message: `A duplicate communication was already dispatched to this customer on ${new Date(
              record.sentAt
            ).toLocaleString()} within the ${windowHours}h window.`,
            evidenceValue: `Sent on ${new Date(record.sentAt).toISOString()}`,
            generatedValue: message.subject
          })
        );
        break;
      }
    }

    const hasHigh = findings.some((f) => f.severity === SeverityLevel.HIGH);

    return {
      checkId: CheckId.DUPLICATE_OUTREACH,
      checkName: 'Duplicate Outreach Detection',
      status: hasHigh ? CheckStatus.FAILED : CheckStatus.PASSED,
      severity: hasHigh ? SeverityLevel.HIGH : SeverityLevel.INFO,
      reasonCode: findings[0]?.reasonCode,
      message: findings[0]?.message || 'No duplicate recent communications detected.',
      findings,
      evidence: {
        windowHours,
        evaluatedSubject: message.subject
      },
      recommendedAction: hasHigh ? RecommendedAction.BLOCK_MESSAGE : RecommendedAction.NONE,
      durationMs: Date.now() - startTime
    };
  }
}

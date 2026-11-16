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

export class ChannelValidator {
  static async execute(context: ComplianceValidationContext): Promise<IValidationCheckResult> {
    const startTime = Date.now();
    const findings: IValidationFinding[] = [];
    const { message, latestOffers } = context;

    const channel = (message.channel || 'EMAIL').toUpperCase();
    const supportedChannels = ['EMAIL', 'SMS', 'WHATSAPP'];

    if (!supportedChannels.includes(channel)) {
      findings.push(
        FindingBuilder.create({
          ruleId: 'CHANNEL_NOT_SUPPORTED',
          checkId: CheckId.CHANNEL_VALIDATION,
          severity: SeverityLevel.CRITICAL,
          reasonCode: ComplianceReasonCode.CHANNEL_NOT_SUPPORTED,
          message: `Channel '${channel}' is not supported by delivery infrastructure.`,
          evidenceValue: supportedChannels.join(', '),
          generatedValue: channel
        })
      );
    }

    // Check Offer Channel Constraints
    for (const offer of latestOffers || []) {
      if (offer.allowedChannels && offer.allowedChannels.length > 0) {
        const allowed = offer.allowedChannels.map((c) => c.toUpperCase());
        if (!allowed.includes(channel)) {
          findings.push(
            FindingBuilder.create({
              ruleId: 'CHANNEL_OFFER_DISALLOWED',
              checkId: CheckId.CHANNEL_VALIDATION,
              severity: SeverityLevel.HIGH,
              reasonCode: ComplianceReasonCode.CHANNEL_NOT_ALLOWED_BY_OFFER,
              message: `Offer '${offer.offerCode}' forbids delivery via '${channel}' (Allowed: [${allowed.join(', ')}]).`,
              evidenceValue: allowed.join(', '),
              generatedValue: channel
            })
          );
        }
      }
    }

    const hasCritical = findings.some((f) => f.severity === SeverityLevel.CRITICAL);
    const hasHigh = findings.some((f) => f.severity === SeverityLevel.HIGH);

    return {
      checkId: CheckId.CHANNEL_VALIDATION,
      checkName: 'Channel Compatibility Validation',
      status: hasCritical || hasHigh ? CheckStatus.FAILED : CheckStatus.PASSED,
      severity: hasCritical ? SeverityLevel.CRITICAL : hasHigh ? SeverityLevel.HIGH : SeverityLevel.INFO,
      reasonCode: findings[0]?.reasonCode,
      message: findings[0]?.message || `Channel '${channel}' is supported and allowed.`,
      findings,
      evidence: {
        channel,
        supportedChannels
      },
      recommendedAction: hasCritical
        ? RecommendedAction.BLOCK_MESSAGE
        : hasHigh
        ? RecommendedAction.REGENERATE
        : RecommendedAction.NONE,
      durationMs: Date.now() - startTime
    };
  }
}

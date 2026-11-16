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

export class ConsentValidator {
  static async execute(context: ComplianceValidationContext): Promise<IValidationCheckResult> {
    const startTime = Date.now();
    const findings: IValidationFinding[] = [];
    const { message, profile } = context;

    if (!profile || !profile.communicationPreferences) {
      return {
        checkId: CheckId.CONSENT_PREFERENCE,
        checkName: 'Consent & Channel Preference Validation',
        status: CheckStatus.INSUFFICIENT_DATA,
        severity: SeverityLevel.CRITICAL,
        reasonCode: ComplianceReasonCode.CONSENT_MISSING,
        message: 'No communication preference record found for customer.',
        findings: [
          FindingBuilder.create({
            ruleId: 'CONSENT_RECORD_MISSING',
            checkId: CheckId.CONSENT_PREFERENCE,
            severity: SeverityLevel.CRITICAL,
            reasonCode: ComplianceReasonCode.CONSENT_MISSING,
            message: 'Communication preferences missing; cannot establish opt-in consent.'
          })
        ],
        recommendedAction: RecommendedAction.BLOCK_MESSAGE,
        durationMs: Date.now() - startTime
      };
    }

    const prefs = profile.communicationPreferences;
    const requestedChannel = (message.channel || 'EMAIL').toUpperCase();

    // 1. Explicit Global Opt-Out Check
    if (prefs.optedOut) {
      findings.push(
        FindingBuilder.create({
          ruleId: 'CONSENT_GLOBAL_OPT_OUT',
          checkId: CheckId.CONSENT_PREFERENCE,
          severity: SeverityLevel.CRITICAL,
          reasonCode: ComplianceReasonCode.CUSTOMER_OPTED_OUT,
          message: 'Customer has explicitly opted out of marketing communications.',
          evidenceValue: 'optedOut: true',
          generatedValue: `Outreach attempted via ${requestedChannel}`
        })
      );
    }

    // 2. Channel-Specific Consent Check
    let hasChannelConsent = false;
    if (requestedChannel === 'EMAIL') {
      hasChannelConsent = prefs.emailConsent;
    } else if (requestedChannel === 'SMS') {
      hasChannelConsent = prefs.smsConsent;
    } else if (requestedChannel === 'WHATSAPP') {
      hasChannelConsent = prefs.whatsappConsent;
    } else {
      findings.push(
        FindingBuilder.create({
          ruleId: 'CONSENT_UNSUPPORTED_CHANNEL',
          checkId: CheckId.CONSENT_PREFERENCE,
          severity: SeverityLevel.CRITICAL,
          reasonCode: ComplianceReasonCode.CHANNEL_NOT_SUPPORTED,
          message: `Requested communication channel '${requestedChannel}' is not supported.`,
          evidenceValue: 'EMAIL, SMS, WHATSAPP',
          generatedValue: requestedChannel
        })
      );
    }

    if (!hasChannelConsent && !prefs.optedOut) {
      findings.push(
        FindingBuilder.create({
          ruleId: 'CONSENT_CHANNEL_DENIED',
          checkId: CheckId.CONSENT_PREFERENCE,
          severity: SeverityLevel.CRITICAL,
          reasonCode: ComplianceReasonCode.CHANNEL_CONSENT_DENIED,
          message: `Customer has not granted outreach consent for channel '${requestedChannel}'.`,
          evidenceValue: `${requestedChannel} consent: false`,
          generatedValue: `Dispatch attempted via ${requestedChannel}`
        })
      );
    }

    const hasCritical = findings.some((f) => f.severity === SeverityLevel.CRITICAL);

    return {
      checkId: CheckId.CONSENT_PREFERENCE,
      checkName: 'Consent & Channel Preference Validation',
      status: hasCritical ? CheckStatus.FAILED : CheckStatus.PASSED,
      severity: hasCritical ? SeverityLevel.CRITICAL : SeverityLevel.INFO,
      reasonCode: findings[0]?.reasonCode,
      message: findings[0]?.message || 'Customer consent and channel preferences verified.',
      findings,
      evidence: {
        channel: requestedChannel,
        emailConsent: prefs.emailConsent,
        smsConsent: prefs.smsConsent,
        whatsappConsent: prefs.whatsappConsent,
        optedOut: prefs.optedOut
      },
      recommendedAction: hasCritical ? RecommendedAction.BLOCK_MESSAGE : RecommendedAction.NONE,
      durationMs: Date.now() - startTime
    };
  }
}

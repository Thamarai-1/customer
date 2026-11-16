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

export class PrivacyValidator {
  static async execute(context: ComplianceValidationContext): Promise<IValidationCheckResult> {
    const startTime = Date.now();
    const findings: IValidationFinding[] = [];
    const { message, customer } = context;

    const text = `${message.subject} ${message.body}`;

    // 1. JWT Token Leakage
    const jwtRegex = /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]+/g;
    if (jwtRegex.test(text)) {
      findings.push(
        FindingBuilder.create({
          ruleId: 'PRIVACY_JWT_LEAK',
          checkId: CheckId.PRIVACY_DATA_LEAKAGE,
          severity: SeverityLevel.CRITICAL,
          reasonCode: ComplianceReasonCode.CREDENTIAL_LEAKAGE,
          message: 'Message contains an exposed JWT authentication token.',
          evidenceValue: 'JWT pattern detected',
          generatedValue: '[REDACTED_JWT]'
        })
      );
    }

    // 2. API Key / Secret Leakage
    const apiKeyRegex = /(?:sk[-_][a-zA-Z0-9_]{20,}|AIza[0-9A-Za-z-_]{35})/g;
    if (apiKeyRegex.test(text)) {
      findings.push(
        FindingBuilder.create({
          ruleId: 'PRIVACY_API_KEY_LEAK',
          checkId: CheckId.PRIVACY_DATA_LEAKAGE,
          severity: SeverityLevel.CRITICAL,
          reasonCode: ComplianceReasonCode.CREDENTIAL_LEAKAGE,
          message: 'Message contains an exposed API key or provider secret.',
          evidenceValue: 'API Key pattern',
          generatedValue: '[REDACTED_API_KEY]'
        })
      );
    }

    // 3. Password or Hash Exposure
    if (/password\s*[:=]\s*\S+/i.test(text) || /passwordhash/i.test(text)) {
      findings.push(
        FindingBuilder.create({
          ruleId: 'PRIVACY_PASSWORD_EXPOSURE',
          checkId: CheckId.PRIVACY_DATA_LEAKAGE,
          severity: SeverityLevel.CRITICAL,
          reasonCode: ComplianceReasonCode.CREDENTIAL_LEAKAGE,
          message: 'Message contains a password or password hash reference.',
          evidenceValue: 'Credential exposure',
          generatedValue: 'password reference'
        })
      );
    }

    // 4. Raw Internal MongoDB ObjectId Exposure
    const objectIdRegex = /\b[0-9a-fA-F]{24}\b/g;
    const matches = text.match(objectIdRegex) || [];
    // Only flag if it's not a standard hex promo or coupon
    if (matches.length > 0 && (text.includes('ObjectId(') || matches.some((m) => m === customer._id.toString()))) {
      findings.push(
        FindingBuilder.create({
          ruleId: 'PRIVACY_INTERNAL_ID_EXPOSED',
          checkId: CheckId.PRIVACY_DATA_LEAKAGE,
          severity: SeverityLevel.HIGH,
          reasonCode: ComplianceReasonCode.INTERNAL_IDENTIFIER_EXPOSED,
          message: 'Internal MongoDB database ObjectId exposed in customer communication.',
          evidenceValue: 'Internal DB ID',
          generatedValue: matches[0]
        })
      );
    }

    // 5. Cross-Customer Email Address Leakage
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emailsInText = text.match(emailRegex) || [];
    const customerEmail = customer?.email?.toLowerCase() || '';
    for (const em of emailsInText) {
      const lower = em.toLowerCase();
      const isCustomer = lower === customerEmail;
      const isSystemSupport =
        lower.includes('telecom.example.com') ||
        lower.includes('support') ||
        lower.includes('engagement') ||
        lower.includes('help');

      if (!isCustomer && !isSystemSupport) {
        findings.push(
          FindingBuilder.create({
            ruleId: 'PRIVACY_CROSS_CUSTOMER_LEAK',
            checkId: CheckId.PRIVACY_DATA_LEAKAGE,
            severity: SeverityLevel.CRITICAL,
            reasonCode: ComplianceReasonCode.CROSS_CUSTOMER_DATA_LEAKAGE,
            message: `Message references unauthorized third-party or cross-customer email address '${em}'.`,
            evidenceValue: customerEmail,
            generatedValue: em
          })
        );
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
    }

    return {
      checkId: CheckId.PRIVACY_DATA_LEAKAGE,
      checkName: 'Privacy & Sensitive Information Validation',
      status,
      severity,
      reasonCode: findings[0]?.reasonCode,
      message: findings[0]?.message || 'No credentials, internal identifiers or sensitive PII exposed.',
      findings,
      evidence: {
        checkedRecipient: customer?.email
      },
      recommendedAction,
      durationMs: Date.now() - startTime
    };
  }
}

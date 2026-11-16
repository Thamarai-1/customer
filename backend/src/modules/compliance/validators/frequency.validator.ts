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

export class FrequencyValidator {
  static async execute(context: ComplianceValidationContext): Promise<IValidationCheckResult> {
    const startTime = Date.now();
    const findings: IValidationFinding[] = [];
    const { message, communicationHistory, config } = context;

    const limits = config?.frequencyLimits || {
      maxDailyMarketingEmails: 2,
      maxWeeklyMarketingEmails: 5,
      minIntervalHoursMarketing: 12,
      maxBillingRemindersPerMonth: 4
    };

    const isBilling =
      message.objective?.includes('PAYMENT') ||
      message.primarySegment === 'OVERDUE_BILL';

    const now = Date.now();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // Only count sent/delivered communications, NOT unapproved drafts
    const deliveredHistory = (communicationHistory || []).filter(
      (h) =>
        h.deliveryStatus === 'sent' ||
        h.deliveryStatus === 'delivered' ||
        h.deliveryStatus === 'mock_delivered'
    );

    if (isBilling) {
      // Billing frequency checks
      const monthlyBillingCount = deliveredHistory.filter(
        (h) =>
          new Date(h.sentAt) >= oneMonthAgo &&
          (h.subject.toLowerCase().includes('invoice') ||
            h.subject.toLowerCase().includes('payment') ||
            h.subject.toLowerCase().includes('balance'))
      ).length;

      if (monthlyBillingCount >= limits.maxBillingRemindersPerMonth) {
        findings.push(
          FindingBuilder.create({
            ruleId: 'FREQUENCY_BILLING_EXCEEDED',
            checkId: CheckId.CONTACT_FREQUENCY,
            severity: SeverityLevel.HIGH,
            reasonCode: ComplianceReasonCode.BILLING_REMINDER_FREQUENCY_EXCEEDED,
            message: `Customer has received ${monthlyBillingCount} billing reminders in the past 30 days (limit: ${limits.maxBillingRemindersPerMonth}).`,
            evidenceValue: `Limit: ${limits.maxBillingRemindersPerMonth}`,
            generatedValue: `${monthlyBillingCount + 1}`
          })
        );
      }
    } else {
      // Marketing frequency checks
      const dailyCount = deliveredHistory.filter((h) => new Date(h.sentAt) >= oneDayAgo).length;
      if (dailyCount >= limits.maxDailyMarketingEmails) {
        findings.push(
          FindingBuilder.create({
            ruleId: 'FREQUENCY_DAILY_EXCEEDED',
            checkId: CheckId.CONTACT_FREQUENCY,
            severity: SeverityLevel.HIGH,
            reasonCode: ComplianceReasonCode.DAILY_CONTACT_LIMIT_EXCEEDED,
            message: `Daily marketing contact limit reached (${dailyCount} communications sent in last 24h, max: ${limits.maxDailyMarketingEmails}).`,
            evidenceValue: `Max daily: ${limits.maxDailyMarketingEmails}`,
            generatedValue: `${dailyCount + 1}`
          })
        );
      }

      const weeklyCount = deliveredHistory.filter((h) => new Date(h.sentAt) >= oneWeekAgo).length;
      if (weeklyCount >= limits.maxWeeklyMarketingEmails) {
        findings.push(
          FindingBuilder.create({
            ruleId: 'FREQUENCY_WEEKLY_EXCEEDED',
            checkId: CheckId.CONTACT_FREQUENCY,
            severity: SeverityLevel.HIGH,
            reasonCode: ComplianceReasonCode.WEEKLY_CONTACT_LIMIT_EXCEEDED,
            message: `Weekly marketing contact limit reached (${weeklyCount} communications sent in last 7 days, max: ${limits.maxWeeklyMarketingEmails}).`,
            evidenceValue: `Max weekly: ${limits.maxWeeklyMarketingEmails}`,
            generatedValue: `${weeklyCount + 1}`
          })
        );
      }

      // Minimum interval check
      const lastSentItem = deliveredHistory[0];
      if (lastSentItem && lastSentItem.sentAt) {
        const lastSent = new Date(lastSentItem.sentAt).getTime();
        const hoursSinceLast = (now - lastSent) / (1000 * 60 * 60);
        if (hoursSinceLast < limits.minIntervalHoursMarketing) {
          findings.push(
            FindingBuilder.create({
              ruleId: 'FREQUENCY_MIN_INTERVAL',
              checkId: CheckId.CONTACT_FREQUENCY,
              severity: SeverityLevel.MEDIUM,
              reasonCode: ComplianceReasonCode.MINIMUM_CONTACT_INTERVAL_NOT_MET,
              message: `Minimum contact interval not met (${hoursSinceLast.toFixed(1)}h since last communication, minimum required: ${limits.minIntervalHoursMarketing}h).`,
              evidenceValue: `${limits.minIntervalHoursMarketing}h`,
              generatedValue: `${hoursSinceLast.toFixed(1)}h`
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
      checkId: CheckId.CONTACT_FREQUENCY,
      checkName: 'Communication Frequency & Contact Limits',
      status,
      severity,
      reasonCode: findings[0]?.reasonCode,
      message: findings[0]?.message || 'Contact frequency limits respected.',
      findings,
      evidence: {
        deliveredCount: deliveredHistory.length,
        limits
      },
      recommendedAction,
      durationMs: Date.now() - startTime
    };
  }
}

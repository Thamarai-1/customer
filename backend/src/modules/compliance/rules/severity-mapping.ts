import {
  OverallComplianceDecision,
  RecommendedAction,
  SeverityLevel,
  CheckStatus
} from '../compliance.constants.js';
import { IValidationCheckResult, IComplianceSummary } from '../compliance.types.js';

export class SeverityMapper {
  /**
   * Deterministically aggregates check results into an overall compliance decision.
   * Priority:
   * 1. Any CRITICAL failure -> BLOCKED (Action: BLOCK_MESSAGE)
   * 2. Missing mandatory context (INSUFFICIENT_DATA) -> INSUFFICIENT_DATA (Action: ESCALATE_TO_HUMAN)
   * 3. Any HIGH failure -> BLOCKED (Action: REGENERATE)
   * 4. Any MEDIUM failure -> REVISION_REQUIRED (Action: EDIT_REQUIRED)
   * 5. Any WARNING / LOW failure -> PASS_WITH_WARNINGS (Action: REVIEW_REQUIRED)
   * 6. All checks PASSED -> PASS (Action: NONE)
   */
  static aggregateDecision(checks: IValidationCheckResult[]): {
    overallStatus: OverallComplianceDecision;
    decision: RecommendedAction;
    summary: IComplianceSummary;
  } {
    let passed = 0;
    let failed = 0;
    let warnings = 0;
    let skipped = 0;
    let insufficientData = 0;

    let hasCritical = false;
    let hasHigh = false;
    let hasMedium = false;
    let hasWarning = false;
    let hasInsufficient = false;

    for (const check of checks) {
      if (check.status === CheckStatus.PASSED) {
        passed++;
      } else if (check.status === CheckStatus.FAILED) {
        failed++;
        if (check.severity === SeverityLevel.CRITICAL) hasCritical = true;
        else if (check.severity === SeverityLevel.HIGH) hasHigh = true;
        else if (check.severity === SeverityLevel.MEDIUM) hasMedium = true;
        else hasWarning = true;
      } else if (check.status === CheckStatus.WARNING) {
        warnings++;
        hasWarning = true;
      } else if (check.status === CheckStatus.SKIPPED) {
        skipped++;
      } else if (check.status === CheckStatus.INSUFFICIENT_DATA) {
        insufficientData++;
        hasInsufficient = true;
      }
    }

    const summary: IComplianceSummary = {
      totalChecks: checks.length,
      passed,
      failed,
      warnings,
      skipped,
      insufficientData
    };

    if (hasCritical) {
      return {
        overallStatus: OverallComplianceDecision.BLOCKED,
        decision: RecommendedAction.BLOCK_MESSAGE,
        summary
      };
    }

    if (hasInsufficient) {
      return {
        overallStatus: OverallComplianceDecision.INSUFFICIENT_DATA,
        decision: RecommendedAction.ESCALATE_TO_HUMAN,
        summary
      };
    }

    if (hasHigh) {
      return {
        overallStatus: OverallComplianceDecision.BLOCKED,
        decision: RecommendedAction.REGENERATE,
        summary
      };
    }

    if (hasMedium) {
      return {
        overallStatus: OverallComplianceDecision.REVISION_REQUIRED,
        decision: RecommendedAction.EDIT_REQUIRED,
        summary
      };
    }

    if (hasWarning || warnings > 0) {
      return {
        overallStatus: OverallComplianceDecision.PASS_WITH_WARNINGS,
        decision: RecommendedAction.REVIEW_REQUIRED,
        summary
      };
    }

    return {
      overallStatus: OverallComplianceDecision.PASS,
      decision: RecommendedAction.NONE,
      summary
    };
  }
}

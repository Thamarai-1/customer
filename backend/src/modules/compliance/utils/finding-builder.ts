import {
  CheckId,
  SeverityLevel,
  RecommendedAction,
  ComplianceReasonCode
} from '../compliance.constants.js';
import { IValidationFinding } from '../compliance.types.js';

export class FindingBuilder {
  static create(options: {
    ruleId: string;
    checkId: CheckId;
    severity: SeverityLevel;
    reasonCode: ComplianceReasonCode;
    message: string;
    evidenceValue?: string;
    generatedValue?: string;
    recommendedAction?: RecommendedAction;
  }): IValidationFinding {
    let defaultAction: RecommendedAction = RecommendedAction.REVIEW_REQUIRED;

    if (options.severity === SeverityLevel.CRITICAL) {
      defaultAction = RecommendedAction.BLOCK_MESSAGE;
    } else if (options.severity === SeverityLevel.HIGH) {
      defaultAction = RecommendedAction.REGENERATE;
    } else if (options.severity === SeverityLevel.MEDIUM) {
      defaultAction = RecommendedAction.EDIT_REQUIRED;
    } else if (options.severity === SeverityLevel.LOW || options.severity === SeverityLevel.INFO) {
      defaultAction = RecommendedAction.REVIEW_REQUIRED;
    }

    return {
      ruleId: options.ruleId,
      checkId: options.checkId,
      severity: options.severity,
      reasonCode: options.reasonCode,
      message: options.message,
      evidenceValue: options.evidenceValue,
      generatedValue: options.generatedValue,
      recommendedAction: options.recommendedAction || defaultAction
    };
  }
}

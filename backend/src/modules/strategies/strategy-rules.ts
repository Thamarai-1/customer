import { CustomerSegmentType } from '../segmentation/segmentation.constants.js';
import { StrategyEvaluationResult, IStrategyConfig } from './strategies.types.js';
import { DEFAULT_STRATEGY_CONFIGS } from './strategies.constants.js';

export class StrategyRulesEngine {
  /**
   * Deterministically select the primary strategy given customer segments and strategy configurations.
   * Resolves conflicts by priority order:
   * 1. OVERDUE_BILL
   * 2. INACTIVE
   * 3. DECLINING_ACTIVITY
   * 4. LOYALTY_CANDIDATE
   * 5. CONSISTENT_CUSTOMER
   */
  static evaluateStrategy(
    customerSegments: CustomerSegmentType[],
    configs: Record<CustomerSegmentType, IStrategyConfig> = DEFAULT_STRATEGY_CONFIGS,
    options?: { hasOverdueBalance?: boolean; overdueAmount?: number }
  ): StrategyEvaluationResult {
    // If no segments provided or array is empty, default to CONSISTENT_CUSTOMER
    const effectiveSegments = customerSegments.length > 0 
      ? [...customerSegments] 
      : [CustomerSegmentType.CONSISTENT_CUSTOMER];

    // If customer has an overdue balance flagged explicitly, ensure OVERDUE_BILL is included
    if (options?.hasOverdueBalance && !effectiveSegments.includes(CustomerSegmentType.OVERDUE_BILL)) {
      effectiveSegments.push(CustomerSegmentType.OVERDUE_BILL);
    }

    // Sort segments by configured priority ascending (1 = highest urgency)
    const sortedSegments = effectiveSegments.sort((a, b) => {
      const priorityA = configs[a]?.priority ?? 99;
      const priorityB = configs[b]?.priority ?? 99;
      return priorityA - priorityB;
    });

    const primarySegment = sortedSegments[0] ?? CustomerSegmentType.CONSISTENT_CUSTOMER;
    const secondarySegments = sortedSegments.slice(1);
    const selectedConfig = configs[primarySegment] ?? DEFAULT_STRATEGY_CONFIGS[CustomerSegmentType.CONSISTENT_CUSTOMER];

    const reasoning: string[] = [];
    let suppressPromotions = false;

    if (primarySegment === CustomerSegmentType.OVERDUE_BILL) {
      suppressPromotions = !selectedConfig.allowPromotionsWithOverdue;
      if (secondarySegments.length > 0) {
        reasoning.push(
          `Customer matches multiple segments: [${sortedSegments.join(', ')}]. Per policy conflict resolution hierarchy, OVERDUE_BILL (Priority 1) takes precedence over marketing/retention strategies.`
        );
        reasoning.push(
          `Promotional offers and reward redemptions are suppressed until outstanding balance is resolved.`
        );
      } else {
        reasoning.push(
          `Customer evaluated with segment OVERDUE_BILL. Strategy mapped to PAYMENT_RESOLUTION with tone ${selectedConfig.primaryTone}.`
        );
      }
    } else if (secondarySegments.length > 0) {
      reasoning.push(
        `Customer matches multiple segments: [${sortedSegments.join(', ')}]. Prioritized primary segment ${primarySegment} (Priority ${selectedConfig.priority}).`
      );
      if (primarySegment === CustomerSegmentType.INACTIVE && secondarySegments.includes(CustomerSegmentType.LOYALTY_CANDIDATE)) {
        reasoning.push(
          `Dormancy override: Customer has high loyalty potential but is currently INACTIVE. Strategy focuses on WIN_BACK rather than standard loyalty celebration.`
        );
      }
    } else {
      reasoning.push(
        `Customer single segment ${primarySegment} mapped to objective ${selectedConfig.objective} with recommended tone ${selectedConfig.primaryTone}.`
      );
    }

    return {
      primarySegment,
      secondarySegments,
      primaryObjective: selectedConfig.objective,
      recommendedTone: selectedConfig.primaryTone,
      alternativeTones: selectedConfig.alternativeTones,
      recommendedActions: selectedConfig.recommendedActions,
      priorityLevel: selectedConfig.priority,
      suppressPromotions,
      reasoning
    };
  }
}

import { IEvidenceContext } from '../message-generation.types.js';
import { CustomerSegmentType } from '../../segmentation/segmentation.constants.js';
import { StrategyObjective } from '../../strategies/strategies.types.js';
import { SHARED_SYSTEM_PROMPT } from './shared-system.prompt.js';
import { buildAppreciationPrompt } from './appreciation.prompt.js';
import { buildLoyaltyRewardPrompt } from './loyalty-reward.prompt.js';
import { buildReEngagementPrompt } from './re-engagement.prompt.js';
import { buildInactiveCustomerPrompt } from './inactive-customer.prompt.js';
import { buildBillingReminderPrompt } from './billing-reminder.prompt.js';
import { PROMPT_VERSIONS } from '../message-generation.constants.js';

export interface SelectedPrompt {
  systemPrompt: string;
  userPrompt: string;
  promptVersion: string;
  templateName: string;
}

export class PromptSelector {
  static selectPrompt(evidence: IEvidenceContext): SelectedPrompt {
    const primarySegment = evidence.classification.primarySegment;
    const objective = evidence.policyDecision.objective;

    // Check billing/overdue first (conflict priority 1)
    if (
      primarySegment === CustomerSegmentType.OVERDUE_BILL ||
      objective === StrategyObjective.PAYMENT_RESOLUTION
    ) {
      const { systemPrompt, userPrompt } = buildBillingReminderPrompt(evidence);
      return {
        systemPrompt: `${SHARED_SYSTEM_PROMPT}\n\n${systemPrompt}`,
        userPrompt,
        promptVersion: PROMPT_VERSIONS.BILLING_REMINDER,
        templateName: 'BILLING_REMINDER'
      };
    }

    if (
      primarySegment === CustomerSegmentType.INACTIVE ||
      objective === StrategyObjective.WIN_BACK
    ) {
      const { systemPrompt, userPrompt } = buildInactiveCustomerPrompt(evidence);
      return {
        systemPrompt: `${SHARED_SYSTEM_PROMPT}\n\n${systemPrompt}`,
        userPrompt,
        promptVersion: PROMPT_VERSIONS.RETENTION,
        templateName: 'INACTIVE_RETENTION'
      };
    }

    if (
      primarySegment === CustomerSegmentType.DECLINING_ACTIVITY ||
      objective === StrategyObjective.USAGE_STIMULATION
    ) {
      const { systemPrompt, userPrompt } = buildReEngagementPrompt(evidence);
      return {
        systemPrompt: `${SHARED_SYSTEM_PROMPT}\n\n${systemPrompt}`,
        userPrompt,
        promptVersion: PROMPT_VERSIONS.RE_ENGAGEMENT,
        templateName: 'RE_ENGAGEMENT'
      };
    }

    if (
      primarySegment === CustomerSegmentType.LOYALTY_CANDIDATE ||
      objective === StrategyObjective.LOYALTY_RECOGNITION
    ) {
      const { systemPrompt, userPrompt } = buildLoyaltyRewardPrompt(evidence);
      return {
        systemPrompt: `${SHARED_SYSTEM_PROMPT}\n\n${systemPrompt}`,
        userPrompt,
        promptVersion: PROMPT_VERSIONS.LOYALTY_REWARD,
        templateName: 'LOYALTY_REWARD'
      };
    }

    // Default to Appreciation / Relationship Nurture
    const { systemPrompt, userPrompt } = buildAppreciationPrompt(evidence);
    return {
      systemPrompt: `${SHARED_SYSTEM_PROMPT}\n\n${systemPrompt}`,
      userPrompt,
      promptVersion: PROMPT_VERSIONS.APPRECIATION,
      templateName: 'CUSTOMER_APPRECIATION'
    };
  }
}

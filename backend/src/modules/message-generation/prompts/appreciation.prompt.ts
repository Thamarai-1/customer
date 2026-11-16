import { IEvidenceContext } from '../message-generation.types.js';

export const buildAppreciationPrompt = (evidence: IEvidenceContext): { systemPrompt: string; userPrompt: string } => {
  const systemPrompt = `You are generating a Relationship Nurture & Customer Appreciation email.
Objective: CUSTOMER_APPRECIATION
Tone: Warm, Appreciative, and Positive.

Specific Instructions:
- Thank the customer warmly for their continued engagement and partnership.
- Personalize using the customer's verified first name (${evidence.customer.firstName || 'Valued Customer'}) and verified plan (${evidence.customer.activePlan || 'subscription'}).
- Highlight the mutual value of the ongoing relationship.
- Reward Rule: Mention a gift/reward ONLY if an eligible offer is explicitly listed in the evidence. If eligibleOffers is empty, express gratitude without promising material rewards.
- Do NOT invent fake loyalty tiers, fake tenure milestones, or unverified facts.
- Keep the message concise, genuine, and professional.
`;

  const userPrompt = `Verified Customer Evidence:
${JSON.stringify(evidence, null, 2)}

Generate the structured appreciation email draft JSON now.`;

  return { systemPrompt, userPrompt };
};

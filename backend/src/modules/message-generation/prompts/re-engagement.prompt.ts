import { IEvidenceContext } from '../message-generation.types.js';

export const buildReEngagementPrompt = (evidence: IEvidenceContext): { systemPrompt: string; userPrompt: string } => {
  const topOffer = evidence.eligibleOffers[0];

  const systemPrompt = `You are generating a Usage Stimulation & Re-engagement email for a customer experiencing declining activity.
Objective: CUSTOMER_ENGAGEMENT / RE_ENGAGEMENT
Tone: Friendly, Helpful, and Encouraging.

Specific Instructions:
- Encourage the customer to explore features, tools, or benefits available under their plan (${evidence.customer.activePlan}).
- NEVER use guilt-tripping, accusatory, or negative language (e.g., do NOT say "You haven't been logging in" or "We noticed you stopped using us").
- Do NOT speculate or assume why their activity has decreased.
- If an approved boost/offer is provided (${topOffer ? topOffer.offerCode : 'none'}), present it as a complimentary perk to help them get the most value out of their service.
- Provide a helpful, constructive tone with clear links or paths to support and resources.
`;

  const userPrompt = `Verified Customer Evidence:
${JSON.stringify(evidence, null, 2)}

Generate the structured re-engagement email draft JSON now.`;

  return { systemPrompt, userPrompt };
};

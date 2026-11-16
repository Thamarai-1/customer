import { IEvidenceContext } from '../message-generation.types.js';

export const buildLoyaltyRewardPrompt = (evidence: IEvidenceContext): { systemPrompt: string; userPrompt: string } => {
  const topOffer = evidence.eligibleOffers[0];

  const systemPrompt = `You are generating an exclusive VIP Loyalty Recognition & Reward email.
Objective: LOYALTY_REWARD
Tone: Celebratory, Appreciative, and Incentivizing.

Specific Instructions:
- Acknowledge the customer's verified loyalty indicators (Tier: ${evidence.customer.loyaltyTier}, Points: ${evidence.customer.loyaltyPoints}).
- Present the approved loyalty reward clearly using the exact offer details provided:
  ${topOffer ? `- Offer Code: ${topOffer.offerCode}\n- Benefit: ${topOffer.name}\n- Terms: ${topOffer.termsAndConditions.join('; ')}` : '- No promotional offer is currently attached.'}
- Clearly convey the reward terms and expiry date if supplied.
- Do NOT claim that the customer has already redeemed or activated the offer.
- Do NOT invent unapproved rewards, additional points, or external gifts.
- Close with a celebratory note encouraging their continued VIP membership.
`;

  const userPrompt = `Verified Customer Evidence:
${JSON.stringify(evidence, null, 2)}

Generate the structured loyalty reward email draft JSON now.`;

  return { systemPrompt, userPrompt };
};

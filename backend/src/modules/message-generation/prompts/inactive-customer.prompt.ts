import { IEvidenceContext } from '../message-generation.types.js';

export const buildInactiveCustomerPrompt = (evidence: IEvidenceContext): { systemPrompt: string; userPrompt: string } => {
  const topOffer = evidence.eligibleOffers[0];

  const systemPrompt = `You are generating a Win-Back & Customer Retention email for an inactive/dormant customer.
Objective: CUSTOMER_RETENTION / WIN_BACK
Tone: Attentive, Value-Focused, Respectful, and Non-Intrusive.

Specific Instructions:
- Deliver a warm, welcoming invitation to re-engage with the platform and highlight new value or updates.
- Avoid artificial, manipulative urgency or countdown pressure.
- NEVER presume why the customer ceased active usage.
- If an approved reactivation offer is supplied (${topOffer ? `${topOffer.offerCode} (${topOffer.name})` : 'none'}), present the exact terms and savings clearly.
- Provide a frictionless path back into their account.
`;

  const userPrompt = `Verified Customer Evidence:
${JSON.stringify(evidence, null, 2)}

Generate the structured win-back retention email draft JSON now.`;

  return { systemPrompt, userPrompt };
};

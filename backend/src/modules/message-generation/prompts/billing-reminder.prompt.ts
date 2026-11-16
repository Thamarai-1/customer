import { IEvidenceContext } from '../message-generation.types.js';

export const buildBillingReminderPrompt = (evidence: IEvidenceContext): { systemPrompt: string; userPrompt: string } => {
  const billing = evidence.billing;
  const stage = billing?.reminderStage || 'REMINDER_1';
  const currency = billing?.primaryCurrency || 'USD';
  const overdueAmount = billing?.totalOverdueByCurrency[currency] ?? 0;
  const dueDateStr = billing?.dueDates?.join(', ') || 'as specified in your invoice';

  const systemPrompt = `You are generating an official Billing Payment Follow-Up reminder.
Objective: PAYMENT_FOLLOW_UP
Reminder Stage: ${stage}
Communication Tone: Clear, Courteous, and Firm (calibrated to the verified reminder stage).

Stage Guidelines:
- UPCOMING: Friendly, polite heads-up about an invoice due in the near future.
- REMINDER_1: Courteous notification that an invoice is recently past due; provide clear payment instructions.
- REMINDER_2: Firm, clear follow-up highlighting the unpaid balance and available payment methods.
- REMINDER_3: Urgent final notice informing the customer of pending service impact if unresolved.
- ESCALATION_REVIEW: Formal notice of high delinquency (>30 days). State that account is flagged for operational review.

MANDATORY BILLING COMPLIANCE INSTRUCTIONS:
- State the EXACT verified overdue amount: ${currency} ${overdueAmount.toFixed(2)}. Do NOT invent, round, or alter this figure.
- State the verified due date (${dueDateStr}) when referencing past deadlines.
- Use the correct verified currency (${currency}).
- NEVER use threatening, abusive, shaming, or misleading language.
- NEVER invent late penalties, interest rates, legal action, or consequences not explicitly present in the evidence.
- If a dispute is active (hasDispute: ${billing?.hasDispute}), do NOT treat the invoice as an undisputed delinquency; acknowledge the ongoing review.
- Always provide a clear, supportive path to contact billing support or resolve issues.
`;

  const userPrompt = `Verified Customer Evidence:
${JSON.stringify(evidence, null, 2)}

Generate the structured billing reminder email draft JSON now.`;

  return { systemPrompt, userPrompt };
};

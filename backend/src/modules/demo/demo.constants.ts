export const DEMO_SCENARIOS = [
  {
    id: 'consistent',
    name: 'Scenario 1: Consistent Customer',
    customerId: 'CUST-1001',
    customerName: 'Aarav Sharma',
    expectedSegment: 'CONSISTENT_CUSTOMER',
    objective: 'Appreciation & Retention',
    deliveryMode: 'MOCK',
    description: 'Customer with steady 6-month usage and transactions. Deterministically classified as Consistent Customer, receiving personalized appreciation with grounded usage summary.'
  },
  {
    id: 'loyalty',
    name: 'Scenario 2: High Loyalty Candidate',
    customerId: 'CUST-1031',
    customerName: 'Pooja Patel',
    expectedSegment: 'LOYALTY_CANDIDATE',
    objective: 'VIP Tier Reward & Upgrade Offer',
    deliveryMode: 'MOCK',
    description: 'High-tenure customer with 2,400+ points. Evaluated for VIP discount offer with deterministic eligibility, grounded terms, and human-approved mock delivery.'
  },
  {
    id: 'declining',
    name: 'Scenario 3: Declining Activity',
    customerId: 'CUST-1056',
    customerName: 'James Verma',
    expectedSegment: 'DECLINING_ACTIVITY',
    objective: 'Soft Re-engagement & Feedback',
    deliveryMode: 'DRAFT_ONLY',
    description: 'Customer whose engagement has dropped 65% over the past 45 days. Receives a sensitive re-engagement invitation staged in DRAFT_ONLY mode.'
  },
  {
    id: 'inactive',
    name: 'Scenario 4: Inactive Customer',
    customerId: 'CUST-1081',
    customerName: 'Harper Singh',
    expectedSegment: 'INACTIVE',
    objective: 'Winback & Account Reactivation',
    deliveryMode: 'MOCK',
    description: 'Customer dormant for over 90 days with zero active sessions. Deterministically classified as Inactive with respectful, non-coercive reactivation communication.'
  },
  {
    id: 'overdue',
    name: 'Scenario 5: Overdue Billing Reminder',
    customerId: 'CUST-1101',
    customerName: 'Daniel Reddy',
    expectedSegment: 'OVERDUE_BILL',
    objective: 'Stage 1 Overdue Notice & Payment Link',
    deliveryMode: 'MOCK',
    description: 'Customer with an overdue invoice of $185.50 past 14 days. Validates exact balance, due date, payment options, and transparent dispute assistance.'
  }
] as const;

export const DEMO_REFUSALS = [
  {
    id: 'optout',
    name: 'Refusal Case A: Customer Opted Out',
    description: 'Customer explicitly revoked email consent. System blocks compliance and delivery immediately.',
    expectedBlockStage: 'Compliance Consent Validator & Delivery Preconditions'
  },
  {
    id: 'paid-invoice',
    name: 'Refusal Case B: Invoice Already Paid',
    description: 'Billing reminder initiated, but customer paid balance ($0.00). Final pre-delivery check blocks dispatch.',
    expectedBlockStage: 'Delivery Preconditions (Billing Revalidation)'
  },
  {
    id: 'expired-offer',
    name: 'Refusal Case C: Promotional Offer Expired',
    description: 'Campaign offer past validUntil date. Offer validator and pre-delivery checks reject the communication.',
    expectedBlockStage: 'Compliance Offer Validator & Delivery Preconditions'
  },
  {
    id: 'duplicate-send',
    name: 'Refusal Case D: Duplicate Communication Prevention',
    description: 'Attempt to dispatch identical message version twice. Idempotency engine prevents redundant delivery.',
    expectedBlockStage: 'Delivery Idempotency Engine'
  },
  {
    id: 'hallucination',
    name: 'Refusal Case E: Unsupported Factual Claim',
    description: 'Message contains an invented discount or false balance. Grounding validator catches discrepancy.',
    expectedBlockStage: 'Compliance Grounding Validator'
  }
] as const;

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AIProviderFactory } from '../src/modules/ai/ai-provider.factory.js';
import { AIProviderType, AIRequest, AIResponse } from '../src/modules/ai/ai-provider.types.js';
import { IAIProvider } from '../src/modules/ai/ai-provider.interface.js';
import { GroundingValidator } from '../src/modules/message-generation/grounding-validator.js';
import { GroundingStatus } from '../src/modules/message-generation/message-generation.constants.js';
import { PromptSelector } from '../src/modules/message-generation/prompts/prompt-selector.js';
import { CustomerSegmentType } from '../src/modules/segmentation/segmentation.constants.js';
import { StrategyObjective, CommunicationTone } from '../src/modules/strategies/strategies.types.js';
import { ReminderStage } from '../src/modules/billing-policies/billing-policies.types.js';
import { IEvidenceContext, IGeneratedEmailStructured } from '../src/modules/message-generation/message-generation.types.js';

describe('Phase 5: AI Provider Abstraction & Grounding Validator Unit Tests', () => {
  beforeEach(() => {
    AIProviderFactory.clearMockProviders();
  });

  afterEach(() => {
    AIProviderFactory.clearMockProviders();
  });

  describe('AI Provider Factory and Mock Registration', () => {
    it('returns default provider when none is requested', () => {
      const provider = AIProviderFactory.getProvider();
      expect(provider).toBeDefined();
      expect(provider.providerName).toBe(AIProviderType.OPENAI);
    });

    it('returns requested provider by type (OpenAI, Gemini, Anthropic)', () => {
      const openai = AIProviderFactory.getProvider(AIProviderType.OPENAI);
      expect(openai.providerName).toBe(AIProviderType.OPENAI);

      const gemini = AIProviderFactory.getProvider(AIProviderType.GEMINI);
      expect(gemini.providerName).toBe(AIProviderType.GEMINI);

      const anthropic = AIProviderFactory.getProvider(AIProviderType.ANTHROPIC);
      expect(anthropic.providerName).toBe(AIProviderType.ANTHROPIC);
    });

    it('allows registering a mock provider for deterministic automated testing', async () => {
      const mockProvider: IAIProvider = {
        providerName: AIProviderType.OPENAI,
        defaultModel: 'mock-gpt-test',
        isAvailable: () => true,
        generateStructuredOutput: async <T>(req: AIRequest<T>): Promise<AIResponse<T>> => {
          return {
            data: { mockSuccess: true } as unknown as T,
            rawContent: '{"mockSuccess": true}',
            provider: AIProviderType.OPENAI,
            model: 'mock-gpt-test',
            latencyMs: 15,
            tokenUsage: { promptTokens: 50, completionTokens: 20, totalTokens: 70 }
          };
        }
      };

      AIProviderFactory.registerMockProvider(AIProviderType.OPENAI, mockProvider);
      const resolved = AIProviderFactory.getProvider(AIProviderType.OPENAI);
      expect(resolved).toBe(mockProvider);

      const res = await resolved.generateStructuredOutput<any>({
        systemPrompt: 'test',
        userPrompt: 'test'
      });
      expect(res.data.mockSuccess).toBe(true);
      expect(res.latencyMs).toBe(15);
    });

    it('lists all providers and their availability without leaking credentials', () => {
      const list = AIProviderFactory.listProviders();
      expect(list.length).toBe(3);
      const names = list.map((p) => p.provider);
      expect(names).toContain(AIProviderType.OPENAI);
      expect(names).toContain(AIProviderType.GEMINI);
      expect(names).toContain(AIProviderType.ANTHROPIC);

      for (const p of list) {
        expect(p.defaultModel).toBeDefined();
        expect(typeof p.isConfigured).toBe('boolean');
        expect((p as any).apiKey).toBeUndefined();
      }
    });
  });

  describe('PromptSelector Version & Strategy Mapping', () => {
    const baseEvidence: IEvidenceContext = {
      customer: {
        firstName: 'Marcus',
        activePlan: 'Unlimited Pro',
        loyaltyTier: 'GOLD',
        loyaltyPoints: 500,
        membershipDurationDays: 120
      },
      classification: {
        primarySegment: CustomerSegmentType.CONSISTENT_CUSTOMER,
        segments: [],
        reasonCodes: ['REGULAR_ACTIVITY']
      },
      policyDecision: {
        objective: StrategyObjective.RELATIONSHIP_NURTURE,
        tone: CommunicationTone.WARM_APPRECIATIVE,
        alternativeTones: [],
        recommendedActions: ['THANK_CUSTOMER'],
        suppressPromotions: false
      },
      eligibleOffers: [],
      communication: {
        channel: 'EMAIL',
        consentGranted: true
      }
    };

    it('selects APPRECIATION prompt for CONSISTENT_CUSTOMER', () => {
      const prompt = PromptSelector.selectPrompt(baseEvidence);
      expect(prompt.templateName).toBe('CUSTOMER_APPRECIATION');
      expect(prompt.systemPrompt).toContain('Customer Appreciation');
      expect(prompt.promptVersion).toBe('1.0.0');
    });

    it('selects LOYALTY_REWARD prompt for LOYALTY_CANDIDATE', () => {
      const evidence: IEvidenceContext = {
        ...baseEvidence,
        classification: { ...baseEvidence.classification, primarySegment: CustomerSegmentType.LOYALTY_CANDIDATE },
        policyDecision: { ...baseEvidence.policyDecision, objective: StrategyObjective.LOYALTY_RECOGNITION }
      };
      const prompt = PromptSelector.selectPrompt(evidence);
      expect(prompt.templateName).toBe('LOYALTY_REWARD');
      expect(prompt.systemPrompt).toContain('VIP Loyalty Recognition');
    });

    it('selects RE_ENGAGEMENT prompt for DECLINING_ACTIVITY', () => {
      const evidence: IEvidenceContext = {
        ...baseEvidence,
        classification: { ...baseEvidence.classification, primarySegment: CustomerSegmentType.DECLINING_ACTIVITY },
        policyDecision: { ...baseEvidence.policyDecision, objective: StrategyObjective.USAGE_STIMULATION }
      };
      const prompt = PromptSelector.selectPrompt(evidence);
      expect(prompt.templateName).toBe('RE_ENGAGEMENT');
      expect(prompt.systemPrompt).toContain('Usage Stimulation & Re-engagement');
    });

    it('selects RETENTION prompt for INACTIVE customer', () => {
      const evidence: IEvidenceContext = {
        ...baseEvidence,
        classification: { ...baseEvidence.classification, primarySegment: CustomerSegmentType.INACTIVE },
        policyDecision: { ...baseEvidence.policyDecision, objective: StrategyObjective.WIN_BACK }
      };
      const prompt = PromptSelector.selectPrompt(evidence);
      expect(prompt.templateName).toBe('INACTIVE_RETENTION');
      expect(prompt.systemPrompt).toContain('Win-Back & Customer Retention');
    });

    it('selects BILLING_REMINDER prompt for OVERDUE_BILL', () => {
      const evidence: IEvidenceContext = {
        ...baseEvidence,
        classification: { ...baseEvidence.classification, primarySegment: CustomerSegmentType.OVERDUE_BILL },
        policyDecision: { ...baseEvidence.policyDecision, objective: StrategyObjective.PAYMENT_RESOLUTION },
        billing: {
          reminderStage: ReminderStage.REMINDER_2,
          totalOverdueByCurrency: { USD: 150 },
          totalOutstandingByCurrency: { USD: 150 },
          primaryCurrency: 'USD',
          dueDates: ['2026-05-15'],
          hasDispute: false,
          requiresHumanReview: false
        }
      };
      const prompt = PromptSelector.selectPrompt(evidence);
      expect(prompt.templateName).toBe('BILLING_REMINDER');
      expect(prompt.systemPrompt).toContain('Billing Payment Follow-Up');
    });
  });

  describe('Deterministic GroundingValidator Verification', () => {
    const mockEvidence: IEvidenceContext = {
      customer: {
        firstName: 'Elena',
        activePlan: 'Enterprise Cloud',
        loyaltyTier: 'PLATINUM',
        loyaltyPoints: 850,
        membershipDurationDays: 300
      },
      classification: {
        primarySegment: CustomerSegmentType.LOYALTY_CANDIDATE,
        segments: [],
        reasonCodes: ['HIGH_LOYALTY_POINTS']
      },
      policyDecision: {
        objective: StrategyObjective.LOYALTY_REWARD,
        tone: CommunicationTone.CELEBRATORY_INCENTIVIZING,
        alternativeTones: [],
        recommendedActions: ['OFFER_REWARD'],
        suppressPromotions: false
      },
      eligibleOffers: [
        {
          offerCode: 'OFFER-VIP-DOUBLE',
          name: 'VIP Double Points',
          offerType: 'PERCENTAGE_DISCOUNT',
          value: 20,
          valueType: 'PERCENTAGE',
          currency: 'USD',
          termsAndConditions: ['Valid for active members']
        }
      ],
      billing: {
        reminderStage: ReminderStage.NONE,
        totalOverdueByCurrency: { USD: 0 },
        totalOutstandingByCurrency: { USD: 0 },
        primaryCurrency: 'USD',
        dueDates: [],
        hasDispute: false,
        requiresHumanReview: false
      },
      communication: {
        channel: 'EMAIL',
        consentGranted: true
      }
    };

    it('passes validation when message is fully grounded in supplied evidence', () => {
      const validMessage: IGeneratedEmailStructured = {
        subject: 'Celebrate your Platinum Loyalty milestone with us',
        body: 'Dear Elena,\n\nThank you for being a valued Platinum member! Enjoy 20% off your next renewal using code OFFER-VIP-DOUBLE.',
        objective: 'LOYALTY_REWARD',
        tone: ['CELEBRATORY_INCENTIVIZING'],
        referencedOffers: ['OFFER-VIP-DOUBLE'],
        referencedBillingFacts: []
      };

      const result = GroundingValidator.validate(validMessage, mockEvidence);
      expect(result.isGrounded).toBe(true);
      expect(result.status).toBe(GroundingStatus.PASSED);
      expect(result.findings.filter((f) => f.severity === 'ERROR').length).toBe(0);
    });

    it('REJECTS message referencing an unapproved / invented offer code', () => {
      const invalidMessage: IGeneratedEmailStructured = {
        subject: 'Special offer for you',
        body: 'Dear Elena,\n\nUse code OFFER-UNAPPROVED-99 to get free benefits!',
        objective: 'LOYALTY_REWARD',
        tone: 'CELEBRATORY_INCENTIVIZING',
        referencedOffers: ['OFFER-UNAPPROVED-99'],
        referencedBillingFacts: []
      };

      const result = GroundingValidator.validate(invalidMessage, mockEvidence);
      expect(result.isGrounded).toBe(false);
      expect(result.status).toBe(GroundingStatus.FAILED);
      expect(result.findings.some((f) => f.rule === 'unapprovedOfferReferenced')).toBe(true);
    });

    it('REJECTS message with an invented discount percentage exceeding approved offer value', () => {
      const invalidMessage: IGeneratedEmailStructured = {
        subject: 'Massive discount',
        body: 'Dear Elena,\n\nEnjoy a special 50% discount on your next bill with OFFER-VIP-DOUBLE!', // Actual offer is 20%
        objective: 'LOYALTY_REWARD',
        tone: 'CELEBRATORY_INCENTIVIZING',
        referencedOffers: ['OFFER-VIP-DOUBLE'],
        referencedBillingFacts: []
      };

      const result = GroundingValidator.validate(invalidMessage, mockEvidence);
      expect(result.isGrounded).toBe(false);
      expect(result.status).toBe(GroundingStatus.FAILED);
      expect(result.findings.some((f) => f.rule === 'unsupportedDiscountPercentage')).toBe(true);
    });

    it('REJECTS billing reminder citing an incorrect overdue balance', () => {
      const overdueEvidence: IEvidenceContext = {
        ...mockEvidence,
        classification: { ...mockEvidence.classification, primarySegment: CustomerSegmentType.OVERDUE_BILL },
        policyDecision: { ...mockEvidence.policyDecision, objective: StrategyObjective.PAYMENT_RESOLUTION, suppressPromotions: true },
        eligibleOffers: [],
        billing: {
          reminderStage: ReminderStage.REMINDER_2,
          totalOverdueByCurrency: { USD: 175.50 },
          totalOutstandingByCurrency: { USD: 175.50 },
          primaryCurrency: 'USD',
          dueDates: ['2026-05-01'],
          hasDispute: false,
          requiresHumanReview: false
        }
      };

      const wrongAmountMessage: IGeneratedEmailStructured = {
        subject: 'Important notice regarding your invoice',
        body: 'Dear Elena,\n\nPlease note your account has an overdue balance of $450.00 that was due on May 1st.', // Actual is $175.50
        objective: 'PAYMENT_FOLLOW_UP',
        tone: 'CLEAR_COURTEOUS_FIRM',
        referencedOffers: [],
        referencedBillingFacts: ['Due May 1st']
      };

      const result = GroundingValidator.validate(wrongAmountMessage, overdueEvidence);
      expect(result.isGrounded).toBe(false);
      expect(result.status).toBe(GroundingStatus.FAILED);
      expect(result.findings.some((f) => f.rule === 'incorrectBillingAmount')).toBe(true);
    });

    it('REJECTS billing reminder with invented penalty or threatening language', () => {
      const overdueEvidence: IEvidenceContext = {
        ...mockEvidence,
        billing: {
          reminderStage: ReminderStage.REMINDER_3,
          totalOverdueByCurrency: { USD: 200 },
          totalOutstandingByCurrency: { USD: 200 },
          primaryCurrency: 'USD',
          dueDates: ['2026-05-01'],
          hasDispute: false,
          requiresHumanReview: false
        }
      };

      const threateningMessage: IGeneratedEmailStructured = {
        subject: 'Final warning',
        body: 'Dear Elena,\n\nPay $200.00 immediately or we will initiate legal proceedings and report you to police.',
        objective: 'PAYMENT_FOLLOW_UP',
        tone: 'CLEAR_COURTEOUS_FIRM',
        referencedOffers: [],
        referencedBillingFacts: []
      };

      const result = GroundingValidator.validate(threateningMessage, overdueEvidence);
      expect(result.isGrounded).toBe(false);
      expect(result.status).toBe(GroundingStatus.FAILED);
      expect(result.findings.some((f) => f.rule === 'inventedPenaltyOrConsequence')).toBe(true);
    });

    it('REJECTS aggressive collection demand when customer has an active dispute under review', () => {
      const disputedEvidence: IEvidenceContext = {
        ...mockEvidence,
        billing: {
          reminderStage: ReminderStage.NONE,
          totalOverdueByCurrency: { USD: 300 },
          totalOutstandingByCurrency: { USD: 300 },
          primaryCurrency: 'USD',
          dueDates: ['2026-05-01'],
          hasDispute: true,
          requiresHumanReview: false
        }
      };

      const aggressiveDisputeMessage: IGeneratedEmailStructured = {
        subject: 'Final warning on disputed balance',
        body: 'Dear Elena,\n\nThis is your final warning to pay immediately the $300.00 balance.',
        objective: 'PAYMENT_FOLLOW_UP',
        tone: 'CLEAR_COURTEOUS_FIRM',
        referencedOffers: [],
        referencedBillingFacts: []
      };

      const result = GroundingValidator.validate(aggressiveDisputeMessage, disputedEvidence);
      expect(result.isGrounded).toBe(false);
      expect(result.status).toBe(GroundingStatus.FAILED);
      expect(result.findings.some((f) => f.rule === 'disputedDebtMisrepresentation')).toBe(true);
    });
  });
});

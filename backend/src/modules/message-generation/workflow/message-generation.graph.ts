import { StateGraph, Annotation, END, START } from '@langchain/langgraph';
import { CustomerProfileService, AssembledCustomerProfile } from '../../customers/customer-profile.service.js';
import { PolicyEngineService } from '../../policy-engine/policy-engine.service.js';
import { IPolicyEvaluationReport } from '../../policy-engine/policy-engine.types.js';
import { AIProviderFactory } from '../../ai/ai-provider.factory.js';
import { AIProviderType, TokenUsage } from '../../ai/ai-provider.types.js';
import { AIProviderConfigService } from '../../ai/ai-provider.config.js';
import {
  IEvidenceContext,
  IGeneratedEmailStructured,
  GroundingValidationResult
} from '../message-generation.types.js';
import { MessageGenerationStatus, GroundingStatus } from '../message-generation.constants.js';
import { PromptSelector, SelectedPrompt } from '../prompts/prompt-selector.js';
import { generatedEmailZodSchema } from '../message-generation.schema.js';
import { GroundingValidator } from '../grounding-validator.js';
import { GeneratedMessageModel } from '../message-generation.model.js';
import { CustomerRepository } from '../../customers/customer.repository.js';
import { CustomerSegmentType } from '../../segmentation/segmentation.constants.js';
import { Types } from 'mongoose';
import { logger } from '../../../utils/logger.js';

export const MessageGenerationStateAnnotation = Annotation.Root({
  customerId: Annotation<string>,
  customerRef: Annotation<string | undefined>,
  requestedChannel: Annotation<string>,
  providerOverride: Annotation<AIProviderType | undefined>,
  modelOverride: Annotation<string | undefined>,
  customerProfile: Annotation<AssembledCustomerProfile | undefined>,
  policyReport: Annotation<IPolicyEvaluationReport | undefined>,
  preconditionsPassed: Annotation<boolean>,
  refusalReason: Annotation<string | undefined>,
  evidenceContext: Annotation<IEvidenceContext | undefined>,
  promptTemplate: Annotation<SelectedPrompt | undefined>,
  structuredOutput: Annotation<IGeneratedEmailStructured | undefined>,
  groundingResult: Annotation<GroundingValidationResult | undefined>,
  retryCount: Annotation<number>,
  maxRetries: Annotation<number>,
  generationStatus: Annotation<MessageGenerationStatus>,
  persistedMessageId: Annotation<string | undefined>,
  error: Annotation<string | undefined>,
  providerUsed: Annotation<string>,
  modelUsed: Annotation<string>,
  latencyMs: Annotation<number>,
  tokenUsage: Annotation<TokenUsage | undefined>
});

export type MessageGenerationState = typeof MessageGenerationStateAnnotation.State;

// Node 1: Load Customer Context
export const loadCustomerContextNode = async (
  state: MessageGenerationState
): Promise<Partial<MessageGenerationState>> => {
  try {
    const customer = await CustomerRepository.findByIdOrCustomerId(state.customerId);
    if (!customer) {
      return {
        error: `CUSTOMER_NOT_FOUND: Customer ${state.customerId} does not exist`,
        preconditionsPassed: false,
        refusalReason: 'Customer not found in database',
        generationStatus: MessageGenerationStatus.REFUSED
      };
    }

    const profile = await CustomerProfileService.assembleProfile(customer.customerId);
    return {
      customerProfile: profile,
      customerRef: customer._id.toString()
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      error: message,
      preconditionsPassed: false,
      refusalReason: `Failed to load customer profile: ${message}`,
      generationStatus: MessageGenerationStatus.FAILED
    };
  }
};

// Node 2: Retrieve Policy Decision
export const retrievePolicyDecisionNode = async (
  state: MessageGenerationState
): Promise<Partial<MessageGenerationState>> => {
  if (state.error || state.preconditionsPassed === false) {
    return {};
  }

  try {
    const policyReport = await PolicyEngineService.evaluateCustomerPolicy(
      state.customerId,
      { channel: state.requestedChannel }
    );

    return { policyReport };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      error: message,
      preconditionsPassed: false,
      refusalReason: `Failed to evaluate policy decision: ${message}`,
      generationStatus: MessageGenerationStatus.FAILED
    };
  }
};

// Node 3: Check Generation Preconditions
export const checkPreconditionsNode = async (
  state: MessageGenerationState
): Promise<Partial<MessageGenerationState>> => {
  if (state.error || state.preconditionsPassed === false) {
    return { preconditionsPassed: false };
  }

  const { customerProfile, policyReport } = state;

  if (!customerProfile || !policyReport) {
    return {
      preconditionsPassed: false,
      refusalReason: 'Missing customer profile or policy evaluation report',
      generationStatus: MessageGenerationStatus.REFUSED
    };
  }

  // Channel Consent Precondition Check
  if (!policyReport.channelConsent.isEligibleForOutreach) {
    return {
      preconditionsPassed: false,
      refusalReason: policyReport.channelConsent.outreachWarning || 'Customer has not granted communication consent',
      generationStatus: MessageGenerationStatus.REFUSED
    };
  }

  // Account Status Check
  if (customerProfile.customer.accountStatus === 'ARCHIVED' || customerProfile.customer.accountStatus === 'SUSPENDED') {
    return {
      preconditionsPassed: false,
      refusalReason: `Customer account is ${customerProfile.customer.accountStatus}; marketing generation halted`,
      generationStatus: MessageGenerationStatus.REFUSED
    };
  }

  return { preconditionsPassed: true };
};

// Node 4: Build Evidence Context
export const buildEvidenceContextNode = async (
  state: MessageGenerationState
): Promise<Partial<MessageGenerationState>> => {
  const { customerProfile, policyReport } = state;
  if (!customerProfile || !policyReport) {
    return {};
  }

  const customer = customerProfile.customer;
  const strategy = policyReport.strategy;
  const billing = policyReport.billing;

  // Build eligible offers (if promotions suppressed, provide empty array)
  const eligibleOffers = strategy.suppressPromotions
    ? []
    : policyReport.offers.eligibleOffers.map((o) => {
        const fullOffer = policyReport.recommendation.messageGenerationContext.offerDetails;
        return {
          offerCode: o.offerCode,
          name: fullOffer?.name || o.offerCode,
          offerType: fullOffer?.valueType || 'FIXED_DISCOUNT',
          value: fullOffer?.value ?? 0,
          valueType: fullOffer?.valueType || 'FIXED_AMOUNT',
          currency: 'USD',
          termsAndConditions: fullOffer?.terms || []
        };
      });

  const topCampaign = policyReport.campaigns.matchedActiveCampaigns[0];

  const primaryCurrency = Object.keys(billing.totalOverdueByCurrency)[0] || 'USD';

  const evidenceContext: IEvidenceContext = {
    customer: {
      firstName: customer.firstName,
      activePlan: customerProfile.subscription.activePlan || 'Standard Subscription',
      loyaltyTier: customer.loyaltyTier,
      loyaltyPoints: customer.loyaltyPoints,
      membershipDurationDays: policyReport.customerSummary.membershipDays
    },
    classification: {
      primarySegment: strategy.primarySegment,
      segments: strategy.secondarySegments,
      reasonCodes: strategy.reasoning
    },
    policyDecision: {
      objective: strategy.primaryObjective,
      tone: strategy.recommendedTone,
      alternativeTones: strategy.alternativeTones,
      recommendedActions: strategy.recommendedActions,
      suppressPromotions: strategy.suppressPromotions
    },
    campaign: topCampaign
      ? {
          campaignCode: topCampaign.campaignCode,
          name: topCampaign.name,
          description: topCampaign.objective,
          mandatoryDisclaimers: [],
          blockedKeywords: []
        }
      : undefined,
    eligibleOffers,
    billing:
      billing.highestStage !== 'NONE' || Object.values(billing.totalOverdueByCurrency).some((v) => v > 0)
        ? {
            reminderStage: billing.highestStage as any,
            totalOverdueByCurrency: billing.totalOverdueByCurrency,
            totalOutstandingByCurrency: billing.totalOutstandingByCurrency,
            primaryCurrency,
            dueDates: billing.invoices.map((i) => i.dueDate ? String(i.dueDate).slice(0, 10) : ''),
            hasDispute: billing.hasDisputedInvoices,
            requiresHumanReview: billing.requiresHumanReview
          }
        : undefined,
    communication: {
      channel: state.requestedChannel,
      consentGranted: policyReport.channelConsent.isEligibleForOutreach
    }
  };

  return { evidenceContext };
};

// Node 5: Select Message Prompt
export const selectPromptNode = async (
  state: MessageGenerationState
): Promise<Partial<MessageGenerationState>> => {
  if (!state.evidenceContext) {
    return {};
  }
  const promptTemplate = PromptSelector.selectPrompt(state.evidenceContext);
  return { promptTemplate };
};

// Node 6: Generate Structured Email
export const generateStructuredEmailNode = async (
  state: MessageGenerationState
): Promise<Partial<MessageGenerationState>> => {
  if (!state.evidenceContext || !state.promptTemplate) {
    return {
      error: 'Missing prompt template or evidence context for LLM generation',
      generationStatus: MessageGenerationStatus.FAILED
    };
  }

  const provider = AIProviderFactory.getProvider(state.providerOverride);
  const runtimeConfig = AIProviderConfigService.getRuntimeConfig();
  const model = state.modelOverride || AIProviderConfigService.getEffectiveModel(provider.providerName);

  let userPrompt = state.promptTemplate.userPrompt;

  // If this is a retry attempt, augment user prompt with grounding/schema feedback
  if (state.retryCount > 0 && state.groundingResult?.findings) {
    const errorDetails = state.groundingResult.findings
      .filter((f) => f.severity === 'ERROR')
      .map((f) => `- [${f.rule}] ${f.message}`)
      .join('\n');
    userPrompt += `\n\nATTENTION: A previous generation failed validation with the following findings:\n${errorDetails}\nPlease regenerate the draft strictly correcting these errors and strictly using only supplied evidence.`;
  }

  try {
    const response = await provider.generateStructuredOutput<IGeneratedEmailStructured>(
      {
        systemPrompt: state.promptTemplate.systemPrompt,
        userPrompt,
        schema: generatedEmailZodSchema as any,
        temperature: runtimeConfig.temperature,
        maxTokens: runtimeConfig.maxTokens,
        timeoutMs: runtimeConfig.timeoutMs
      },
      model
    );

    return {
      structuredOutput: response.data,
      providerUsed: response.provider,
      modelUsed: response.model,
      latencyMs: response.latencyMs,
      tokenUsage: response.tokenUsage
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`LLM Generation error with provider ${provider.providerName}: ${message}`, 'MessageGenerationGraph');
    return {
      error: message,
      retryCount: state.retryCount + 1,
      generationStatus: MessageGenerationStatus.FAILED
    };
  }
};

// Node 7: Validate Structured Output
export const validateStructuredOutputNode = async (
  state: MessageGenerationState
): Promise<Partial<MessageGenerationState>> => {
  if (state.error || !state.structuredOutput) {
    return {
      retryCount: state.retryCount + 1
    };
  }

  const result = generatedEmailZodSchema.safeParse(state.structuredOutput);
  if (!result.success) {
    return {
      retryCount: state.retryCount + 1,
      error: `Schema validation failed: ${result.error.errors.map((e) => e.message).join(', ')}`
    };
  }

  return { structuredOutput: result.data };
};

// Node 8: Check Evidence Grounding
export const checkEvidenceGroundingNode = async (
  state: MessageGenerationState
): Promise<Partial<MessageGenerationState>> => {
  if (!state.structuredOutput || !state.evidenceContext) {
    return {
      generationStatus: MessageGenerationStatus.FAILED
    };
  }

  const groundingResult = GroundingValidator.validate(state.structuredOutput, state.evidenceContext);

  if (!groundingResult.isGrounded) {
    const newRetryCount = state.retryCount + 1;
    const isExhausted = newRetryCount >= state.maxRetries;
    return {
      groundingResult,
      retryCount: newRetryCount,
      generationStatus: isExhausted ? MessageGenerationStatus.GROUNDING_FAILED : state.generationStatus
    };
  }

  return {
    groundingResult,
    generationStatus: MessageGenerationStatus.GENERATED
  };
};

// Node 9: Persist Draft
export const persistDraftNode = async (
  state: MessageGenerationState
): Promise<Partial<MessageGenerationState>> => {
  const customerId = state.customerId;
  const customerRef = state.customerRef ? new Types.ObjectId(state.customerRef) : undefined;
  const policyEvaluationId = state.policyReport?.evaluationId
    ? new Types.ObjectId(state.policyReport.evaluationId)
    : undefined;

  const primarySegment =
    state.policyReport?.strategy.primarySegment ||
    state.evidenceContext?.classification.primarySegment ||
    CustomerSegmentType.CONSISTENT_CUSTOMER;

  const objective = state.policyReport?.strategy.primaryObjective || 'CUSTOMER_APPRECIATION';

  const defaultEvidence: IEvidenceContext = {
    customer: {
      firstName: state.customerProfile?.customer.firstName || 'Customer',
      activePlan: state.customerProfile?.subscription.activePlan || 'Standard',
      loyaltyTier: state.customerProfile?.customer.loyaltyTier || 'BRONZE',
      loyaltyPoints: state.customerProfile?.customer.loyaltyPoints || 0,
      membershipDurationDays: 0
    },
    classification: {
      primarySegment: primarySegment as any,
      segments: [],
      reasonCodes: []
    },
    policyDecision: {
      objective: objective as any,
      tone: 'WARM_APPRECIATIVE' as any,
      alternativeTones: [],
      recommendedActions: [],
      suppressPromotions: false
    },
    eligibleOffers: [],
    communication: {
      channel: state.requestedChannel,
      consentGranted: false
    }
  };

  const evidenceSnapshot = state.evidenceContext || defaultEvidence;

  const subject = state.structuredOutput?.subject || (state.preconditionsPassed === false ? '[Generation Refused]' : '[Generation Failed]');
  const body = state.structuredOutput?.body || (state.refusalReason ? `Generation Refused: ${state.refusalReason}` : `Generation Failed: ${state.error || 'Unknown error'}`);

  const doc = await GeneratedMessageModel.create({
    customerId,
    customerRef: customerRef || new Types.ObjectId(),
    policyEvaluationId,
    primarySegment: primarySegment as any,
    objective,
    channel: state.requestedChannel,
    subject,
    body,
    referencedOffers: state.structuredOutput?.referencedOffers || [],
    referencedBillingFacts: state.structuredOutput?.referencedBillingFacts || [],
    generationStatus: state.generationStatus,
    groundingStatus: state.groundingResult?.status || GroundingStatus.FAILED,
    validationFindings: state.groundingResult?.findings || [],
    provider: state.providerUsed || state.providerOverride || 'OPENAI',
    model: state.modelUsed || 'default',
    promptVersion: state.promptTemplate?.promptVersion || '1.0.0',
    tokenUsage: state.tokenUsage,
    latencyMs: state.latencyMs || 0,
    retryCount: state.retryCount,
    evidenceSnapshot,
    refusalReason: state.refusalReason,
    generatedAt: new Date()
  });

  return {
    persistedMessageId: doc._id.toString()
  };
};

/**
 * Builds and compiles the LangGraph Message Generation StateGraph.
 */
export const buildMessageGenerationGraph = () => {
  const workflow = new StateGraph(MessageGenerationStateAnnotation)
    .addNode('loadCustomerContext', loadCustomerContextNode)
    .addNode('retrievePolicyDecision', retrievePolicyDecisionNode)
    .addNode('checkPreconditions', checkPreconditionsNode)
    .addNode('buildEvidenceContext', buildEvidenceContextNode)
    .addNode('selectPrompt', selectPromptNode)
    .addNode('generateStructuredEmail', generateStructuredEmailNode)
    .addNode('validateStructuredOutput', validateStructuredOutputNode)
    .addNode('checkEvidenceGrounding', checkEvidenceGroundingNode)
    .addNode('persistDraft', persistDraftNode)

    .addEdge(START, 'loadCustomerContext')
    .addEdge('loadCustomerContext', 'retrievePolicyDecision')
    .addEdge('retrievePolicyDecision', 'checkPreconditions')

    // Conditional routing after preconditions check
    .addConditionalEdges('checkPreconditions', (state) => {
      if (state.preconditionsPassed === false || state.error) {
        return 'persistDraft';
      }
      return 'buildEvidenceContext';
    })

    .addEdge('buildEvidenceContext', 'selectPrompt')
    .addEdge('selectPrompt', 'generateStructuredEmail')
    .addEdge('generateStructuredEmail', 'validateStructuredOutput')
    .addEdge('validateStructuredOutput', 'checkEvidenceGrounding')

    // Conditional routing after grounding check: retry loop or persist
    .addConditionalEdges('checkEvidenceGrounding', (state) => {
      if (
        state.groundingResult &&
        !state.groundingResult.isGrounded &&
        state.retryCount < state.maxRetries
      ) {
        return 'generateStructuredEmail';
      }
      return 'persistDraft';
    })

    .addEdge('persistDraft', END);

  return workflow.compile();
};

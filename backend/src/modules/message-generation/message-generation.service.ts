import { Types } from 'mongoose';
import { GeneratedMessageModel } from './message-generation.model.js';
import {
  IGeneratedMessageDocument,
  GenerateDraftOptions,
  RegenerateDraftOptions,
  IEvidenceContext
} from './message-generation.types.js';
import { MessageGenerationStatus } from './message-generation.constants.js';
import {
  buildMessageGenerationGraph,
  loadCustomerContextNode,
  retrievePolicyDecisionNode,
  checkPreconditionsNode,
  buildEvidenceContextNode,
  MessageGenerationState
} from './workflow/message-generation.graph.js';
import { PromptSelector, SelectedPrompt } from './prompts/prompt-selector.js';
import { AIProviderConfigService } from '../ai/ai-provider.config.js';
import { CustomerRepository } from '../customers/customer.repository.js';
import { IMessageGenerationRuntimeConfig } from '../ai/ai-provider.types.js';
import { PaginationQueryOptions, getPaginationMeta } from '../../utils/pagination.js';
import { PaginationMeta } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

export class MessageGenerationService {
  /**
   * Executes the complete LangGraph message-generation pipeline.
   */
  static async generateDraft(
    customerId: string,
    options: GenerateDraftOptions = {}
  ): Promise<IGeneratedMessageDocument> {
    const customer = await CustomerRepository.findByIdOrCustomerId(customerId);
    if (!customer) {
      throw new Error(`CUSTOMER_NOT_FOUND: Customer ${customerId} does not exist`);
    }

    const runtimeConfig = AIProviderConfigService.getRuntimeConfig();
    const graph = buildMessageGenerationGraph();

    logger.info(`Starting GenAI message generation workflow for customer ${customer.customerId}`, 'MessageGenerationService');

    const result = await graph.invoke({
      customerId: customer.customerId,
      customerRef: customer._id.toString(),
      requestedChannel: (options.channel || 'EMAIL').toUpperCase(),
      providerOverride: options.provider,
      modelOverride: options.modelOverride,
      retryCount: 0,
      maxRetries: runtimeConfig.retryLimit,
      generationStatus: MessageGenerationStatus.GENERATED
    });

    if (!result.persistedMessageId) {
      throw new Error(result.error || result.refusalReason || 'Failed to generate message draft');
    }

    const message = await GeneratedMessageModel.findById(result.persistedMessageId);
    if (!message) {
      throw new Error('GENERATED_MESSAGE_NOT_FOUND_AFTER_PERSISTENCE');
    }

    return message;
  }

  /**
   * Retrieves a generated message draft by its ID.
   */
  static async getDraftById(messageId: string): Promise<IGeneratedMessageDocument> {
    if (!Types.ObjectId.isValid(messageId)) {
      throw new Error('INVALID_MESSAGE_ID');
    }

    const message = await GeneratedMessageModel.findById(messageId);
    if (!message) {
      throw new Error('MESSAGE_DRAFT_NOT_FOUND');
    }

    return message;
  }

  /**
   * Lists generated drafts for a specific customer with pagination.
   */
  static async listCustomerDrafts(
    customerId: string,
    pagination: PaginationQueryOptions
  ): Promise<{ messages: IGeneratedMessageDocument[]; meta: PaginationMeta }> {
    const customer = await CustomerRepository.findByIdOrCustomerId(customerId);
    const resolvedCustomerId = customer ? customer.customerId : customerId.trim().toUpperCase();
    const query = customer
      ? { $or: [{ customerId: resolvedCustomerId }, { customerRef: customer._id }] }
      : { customerId: resolvedCustomerId };

    const [messages, total] = await Promise.all([
      GeneratedMessageModel.find(query)
        .sort({ [pagination.sortBy]: pagination.sortOrder })
        .skip(pagination.skip)
        .limit(pagination.limit),
      GeneratedMessageModel.countDocuments(query)
    ]);

    const meta = getPaginationMeta(total, pagination.page, pagination.limit);
    return { messages, meta };
  }

  /**
   * Regenerates a new draft for an existing customer, creating a new historical record.
   */
  static async regenerateDraft(
    previousMessageId: string,
    options: RegenerateDraftOptions = {}
  ): Promise<IGeneratedMessageDocument> {
    const previous = await this.getDraftById(previousMessageId);

    logger.info(
      `Regenerating draft from previous message ${previousMessageId}. Reason: ${options.reason || 'None specified'}`,
      'MessageGenerationService'
    );

    return this.generateDraft(previous.customerId, {
      channel: previous.channel,
      provider: options.provider,
      modelOverride: options.modelOverride
    });
  }

  /**
   * Previews the evidence context and selected prompt without invoking LLM providers.
   */
  static async previewContext(
    customerId: string,
    channel = 'EMAIL'
  ): Promise<{
    evidenceContext: IEvidenceContext;
    promptPreview: SelectedPrompt;
    preconditionsPassed: boolean;
    refusalReason?: string;
  }> {
    const customer = await CustomerRepository.findByIdOrCustomerId(customerId);
    if (!customer) {
      throw new Error(`CUSTOMER_NOT_FOUND: Customer ${customerId} does not exist`);
    }

    const initialState: MessageGenerationState = {
      customerId: customer.customerId,
      customerRef: customer._id.toString(),
      requestedChannel: channel.toUpperCase(),
      providerOverride: undefined,
      modelOverride: undefined,
      customerProfile: undefined,
      policyReport: undefined,
      preconditionsPassed: true,
      refusalReason: undefined,
      evidenceContext: undefined,
      promptTemplate: undefined,
      structuredOutput: undefined,
      groundingResult: undefined,
      retryCount: 0,
      maxRetries: 1,
      generationStatus: MessageGenerationStatus.GENERATED,
      persistedMessageId: undefined,
      error: undefined,
      providerUsed: 'PREVIEW',
      modelUsed: 'PREVIEW',
      latencyMs: 0,
      tokenUsage: undefined
    };

    // Step 1: Load Context
    const s1 = { ...initialState, ...(await loadCustomerContextNode(initialState)) };
    if (!s1.customerProfile) {
      throw new Error(s1.error || 'CUSTOMER_NOT_FOUND');
    }

    // Step 2: Policy Decision
    const s2 = { ...s1, ...(await retrievePolicyDecisionNode(s1)) };
    if (!s2.policyReport) {
      throw new Error(s2.error || 'POLICY_EVALUATION_FAILED');
    }

    // Step 3: Check Preconditions
    const s3 = { ...s2, ...(await checkPreconditionsNode(s2)) };

    // Step 4: Build Evidence Context
    const s4 = { ...s3, ...(await buildEvidenceContextNode(s3)) };
    if (!s4.evidenceContext) {
      throw new Error('EVIDENCE_CONTEXT_CONSTRUCTION_FAILED');
    }

    // Step 5: Select Prompt
    const promptPreview = PromptSelector.selectPrompt(s4.evidenceContext);

    return {
      evidenceContext: s4.evidenceContext,
      promptPreview,
      preconditionsPassed: s3.preconditionsPassed,
      refusalReason: s3.refusalReason
    };
  }

  /**
   * Runtime configuration getters and updaters.
   */
  static getConfig(): IMessageGenerationRuntimeConfig {
    return AIProviderConfigService.getRuntimeConfig();
  }

  static updateConfig(
    updates: Partial<IMessageGenerationRuntimeConfig>,
    updatedBy?: string
  ): IMessageGenerationRuntimeConfig {
    return AIProviderConfigService.updateRuntimeConfig(updates, updatedBy);
  }
}

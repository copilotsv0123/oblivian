/**
 * Main LLM service orchestrator
 */

import { getConfig } from "@/lib/config/env";
import { GeminiProvider } from "../providers/gemini";
import { BaseLLMProvider } from "../providers/base-provider";
import { LlmUsageRepository } from "@/lib/repositories/llm-usage-repository";
import type {
  CardGenerationRequest,
  CardGenerationResponse,
  DeckGenerationRequest,
  DeckGenerationResponse,
  EventGenerationRequest,
  EnhancementRequest,
  ModelConfig,
  TokenUsage,
} from "../types";

import { LLMError, RateLimitError, QuotaExceededError } from "../types";

export class LLMService {
  private providers: Map<string, BaseLLMProvider> = new Map();
  private defaultProvider: string = "gemini";
  private usageRepository: LlmUsageRepository;

  constructor() {
    this.initializeProviders();
    this.usageRepository = new LlmUsageRepository();
  }

  private initializeProviders(): void {
    const config = getConfig();

    // Initialize Gemini provider if API key is available
    if (config.GEMINI_API_KEY) {
      const geminiProvider = new GeminiProvider(config.GEMINI_API_KEY, {
        model: config.GEMINI_MODEL || "gemini-1.5-flash",
        temperature: 0.7,
        maxTokens: 2000,
      });
      this.providers.set("gemini", geminiProvider);
    }
  }

  /**
   * Generate flashcards for a deck
   */
  async generateCards(
    request: CardGenerationRequest,
    config?: Partial<ModelConfig>,
    userId?: string,
  ): Promise<CardGenerationResponse> {
    // Basic request validation
    this.validateRequest(request);

    // Select provider and model
    const provider = this.selectProvider(config?.provider);
    const finalConfig = this.selectModel(config);

    try {
      const response = await provider.generateCards(request, finalConfig);

      // Track usage if successful
      if (response.success) {
        await this.trackUsage(request, response, userId);
      }

      return response;
    } catch (error) {
      console.error("LLM Service - Card generation failed:", error);
      throw this.wrapError(error);
    }
  }

  /**
   * Generate a complete deck with cards
   */
  async generateDeck(
    request: DeckGenerationRequest,
    config?: Partial<ModelConfig>,
    userId?: string,
  ): Promise<DeckGenerationResponse> {
    this.validateRequest(request);

    const provider = this.selectProvider(config?.provider);
    const finalConfig = this.selectModel(config);

    try {
      const response = await provider.generateDeck(request, finalConfig);

      // Track usage if successful
      if (response.success) {
        await this.trackUsage(request, response, userId);
      }

      return response;
    } catch (error) {
      console.error("LLM Service - Deck generation failed:", error);
      throw this.wrapError(error);
    }
  }

  /**
   * Generate event-based content
   */
  async generateEventContent(
    request: EventGenerationRequest,
    config?: Partial<ModelConfig>,
    userId?: string,
  ): Promise<CardGenerationResponse> {
    const provider = this.selectProvider(config?.provider);
    const finalConfig = this.selectModel(config);

    try {
      const response = await provider.generateEventContent(request, finalConfig);

      // Track usage if successful
      if (response.success) {
        await this.trackUsage(request, response, userId);
      }

      return response;
    } catch (error) {
      console.error("LLM Service - Event generation failed:", error);
      throw this.wrapError(error);
    }
  }

  /**
   * Enhance existing cards
   */
  async enhanceCards(
    request: EnhancementRequest,
    config?: Partial<ModelConfig>,
    userId?: string,
  ): Promise<CardGenerationResponse> {
    const provider = this.selectProvider(config?.provider);
    const finalConfig = this.selectModel(config);

    try {
      const response = await provider.enhanceCards(request, finalConfig);

      // Track usage if successful
      if (response.success) {
        await this.trackUsage(request, response, userId);
      }

      return response;
    } catch (error) {
      console.error("LLM Service - Enhancement failed:", error);
      throw this.wrapError(error);
    }
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get available models for a provider
   */
  getAvailableModels(providerName?: string): string[] {
    const provider = this.selectProvider(providerName);
    return provider.getModels();
  }

  /**
   * Validate provider health
   */
  async validateProviders(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, provider] of this.providers) {
      try {
        results[name] = await provider.validateConfig();
      } catch {
        results[name] = false;
      }
    }

    return results;
  }

  /**
   * Get usage statistics for a user
   */
  async getUserUsageStats(userId: string): Promise<{
    currentMonth: any
    previousMonth: any
    trend: any
  }> {
    return await this.usageRepository.getMonthlyUsageSummary(userId);
  }

  /**
   * Get usage records for a user
   */
  async getUserUsageRecords(
    userId: string,
    options?: {
      limit?: number
      offset?: number
      status?: 'pending' | 'completed' | 'failed'
      type?: 'cards' | 'deck' | 'event' | 'enhance'
    }
  ) {
    return await this.usageRepository.findUserUsageRecords(userId, options);
  }

  // Private helper methods

  private selectProvider(providerName?: string): BaseLLMProvider {
    const name = providerName || this.defaultProvider;
    const provider = this.providers.get(name);

    if (!provider) {
      throw new LLMError(
        `Provider '${name}' is not available. Available providers: ${this.getAvailableProviders().join(", ")}`,
        "PROVIDER_NOT_FOUND",
      );
    }

    return provider;
  }

  private selectModel(config?: Partial<ModelConfig>): ModelConfig {
    const provider = this.selectProvider(config?.provider);
    const availableModels = provider.getModels();

    const requestedModel = config?.model;
    const selectedModel =
      requestedModel && availableModels.includes(requestedModel)
        ? requestedModel
        : availableModels[0];

    if (!selectedModel) {
      throw new LLMError("No suitable model available", "MODEL_NOT_AVAILABLE");
    }

    return {
      provider: provider.info.name,
      model: selectedModel,
      temperature: config?.temperature ?? 0.7,
      maxTokens: config?.maxTokens ?? 2000,
      topP: config?.topP ?? 1.0,
    };
  }

  private validateRequest(request: any): void {
    if (!request) {
      throw new LLMError("Request is required", "INVALID_REQUEST");
    }

    // Check topic for requests that have it
    if (
      "topic" in request &&
      (!request.topic || request.topic.trim().length < 3)
    ) {
      throw new LLMError(
        "Topic must be at least 3 characters long",
        "INVALID_TOPIC",
      );
    }

    // Check card count limits (reasonable defaults)
    if ("count" in request && (request.count < 1 || request.count > 25)) {
      throw new LLMError(
        "Card count must be between 1 and 25",
        "INVALID_COUNT",
      );
    }

    if (
      "cardCount" in request &&
      (request.cardCount < 1 || request.cardCount > 25)
    ) {
      throw new LLMError(
        "Card count must be between 1 and 25",
        "INVALID_COUNT",
      );
    }

    // Only basic cards supported for now
    if ("cardTypes" in request && !request.cardTypes.includes("basic")) {
      throw new LLMError(
        "Only basic card type is currently supported",
        "UNSUPPORTED_CARD_TYPE",
      );
    }
  }

  private async trackUsage(
    request: any,
    response: any,
    userId?: string,
  ): Promise<void> {
    try {
      // Skip tracking if no user ID provided
      if (!userId) {
        console.warn("Usage tracking skipped: no user ID provided");
        return;
      }

      // Determine request type
      let type: 'cards' | 'deck' | 'event' | 'enhance' = 'cards';
      if ('cardCount' in request) type = 'deck';
      if ('eventType' in request) type = 'event';
      if ('enhancementType' in request) type = 'enhance';

      // Extract token usage
      const tokensUsed: TokenUsage = {
        input: response.metadata?.tokensUsed || 0,
        output: 0, // We'll extract this if available
        total: response.metadata?.tokensUsed || 0
      };

      // If response has detailed token info, use it
      if (response.metadata?.tokensInput !== undefined) {
        tokensUsed.input = response.metadata.tokensInput;
        tokensUsed.output = response.metadata.tokensOutput || 0;
        tokensUsed.total = response.metadata.tokensTotal || tokensUsed.input + tokensUsed.output;
      }

      await this.usageRepository.createUsageRecord({
        userId,
        type,
        inputData: request,
        outputData: response,
        modelUsed: response.metadata?.model || 'unknown',
        tokensUsed,
        costCents: response.metadata?.costCents || 0,
        status: response.success ? 'completed' : 'failed',
        duration: response.metadata?.duration || 0,
        provider: response.metadata?.provider || 'unknown',
        requestId: response.metadata?.requestId || `req_${Date.now()}`,
        errorMessage: response.error,
      });

      console.log("Usage tracked successfully:", {
        userId,
        type,
        tokensUsed: tokensUsed.total,
        costCents: response.metadata?.costCents || 0,
        status: response.success ? 'completed' : 'failed',
      });
    } catch (error) {
      console.error("Failed to track usage:", error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  private wrapError(error: any): LLMError {
    if (error instanceof LLMError) {
      return error;
    }

    if (error.message?.includes("rate limit")) {
      return new RateLimitError("Rate limit exceeded. Please try again later.");
    }

    if (
      error.message?.includes("quota") ||
      error.message?.includes("billing")
    ) {
      return new QuotaExceededError(
        "API quota exceeded. Please check your billing.",
        0,
        0,
      );
    }

    if (error.message?.includes("timeout") || error.message?.includes("timed out")) {
      return new LLMError(
        "Request timed out. Try reducing the card count or try again later.",
        "TIMEOUT",
        undefined,
        undefined,
        error,
      );
    }

    return new LLMError(
      error.message || "Unknown LLM service error",
      "UNKNOWN_ERROR",
      undefined,
      undefined,
      error,
    );
  }
}

// Singleton instance
export const llmService = new LLMService();

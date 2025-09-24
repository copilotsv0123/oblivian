/**
 * Main LLM service orchestrator
 */

import { getConfig } from "@/lib/config/env";
import { OpenAIProvider } from "../providers/openai";
import { BaseLLMProvider } from "../providers/base-provider";
import type {
  CardGenerationRequest,
  CardGenerationResponse,
  DeckGenerationRequest,
  DeckGenerationResponse,
  EventGenerationRequest,
  EnhancementRequest,
  ModelConfig,
} from "../types";

import { LLMError, RateLimitError, QuotaExceededError } from "../types";

export class LLMService {
  private providers: Map<string, BaseLLMProvider> = new Map();
  private defaultProvider: string = "openai";

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    const config = getConfig();

    // Initialize OpenAI provider if API key is available
    if (config.OPENAI_API_KEY) {
      const openaiProvider = new OpenAIProvider(config.OPENAI_API_KEY, {
        model: "gpt-4o-mini", // Default to cost-effective model
        temperature: 0.7,
        maxTokens: 2000,
      });
      this.providers.set("openai", openaiProvider);
    }

    // Add other providers here (Anthropic, etc.)
    // if (config.ANTHROPIC_API_KEY) {
    //   const anthropicProvider = new AnthropicProvider(config.ANTHROPIC_API_KEY)
    //   this.providers.set('anthropic', anthropicProvider)
    // }
  }

  /**
   * Generate flashcards for a deck
   */
  async generateCards(
    request: CardGenerationRequest,
    config?: Partial<ModelConfig>,
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
        await this.trackUsage(request, response);
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
  ): Promise<DeckGenerationResponse> {
    this.validateRequest(request);

    const provider = this.selectProvider(config?.provider);
    const finalConfig = this.selectModel(config);

    try {
      return await provider.generateDeck(request, finalConfig);
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
  ): Promise<CardGenerationResponse> {
    const provider = this.selectProvider(config?.provider);
    const finalConfig = this.selectModel(config);

    try {
      return await provider.generateEventContent(request, finalConfig);
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
  ): Promise<CardGenerationResponse> {
    const provider = this.selectProvider(config?.provider);
    const finalConfig = this.selectModel(config);

    try {
      return await provider.enhanceCards(request, finalConfig);
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
  ): Promise<void> {
    // TODO: Implement usage tracking to database
    // This will be implemented when we add the database schema
    console.log("Usage tracking:", {
      tokensUsed: response.metadata?.tokensUsed || 0,
      costCents: response.metadata?.costCents || 0,
      requestType: "llm_generation",
    });
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

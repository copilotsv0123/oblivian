import { BaseLLMProvider } from "./base-provider";
import {
  buildCardGenerationPrompt,
  buildDeckGenerationPrompt,
  buildEventPrompt,
  buildEnhancementPrompt,
  validateGeneratedCards,
} from "../prompts/card-generation";
import type {
  CardGenerationRequest,
  CardGenerationResponse,
  DeckGenerationRequest,
  DeckGenerationResponse,
  EventGenerationRequest,
  EnhancementRequest,
  ModelConfig,
  TokenUsage,
  LLMProvider,
  GeneratedCard,
} from "../types";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiGenerationResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

export class GeminiProvider extends BaseLLMProvider {
  readonly info: LLMProvider = {
    name: "gemini",
    models: ["gemini-1.5-flash", "gemini-1.5-pro"],
    costPer1KTokens: {
      input: 0.00018,
      output: 0.00054,
    },
  };

  constructor(apiKey: string, defaultConfig?: Partial<ModelConfig>) {
    super(apiKey, defaultConfig);

    if (defaultConfig?.model && !this.info.models.includes(defaultConfig.model)) {
      this.info.models.push(defaultConfig.model);
    }
  }

  async generateCards(
    request: CardGenerationRequest,
    config?: Partial<ModelConfig>
  ): Promise<CardGenerationResponse> {
    try {
      this.validateRequest(request);

      if (!request.cardTypes.includes("basic")) {
        throw new Error("Only basic card type is currently supported");
      }

      const finalConfig = this.mergeConfig(config);
      const { system, user } = buildCardGenerationPrompt({
        ...request,
        cardTypes: ["basic"],
      });

      const startTime = Date.now();
      const response = await this.generateContent(system, user, finalConfig);
      const duration = Date.now() - startTime;
      const content = this.extractText(response);

      let parsed: any;
      try {
        parsed = this.parseJsonResponse(content);
      } catch (error) {
        throw new Error("Invalid JSON response from Gemini");
      }

      const cards = Array.isArray(parsed) ? parsed : parsed.cards || [];

      if (!validateGeneratedCards(cards)) {
        throw new Error("Generated cards do not match expected schema");
      }

      const generatedCards: GeneratedCard[] = cards.map((card: any) => ({
        type: "basic" as const,
        front: card.question || card.front,
        back: card.answer || card.back,
        advancedNotes: card.notes || card.advancedNotes,
        mnemonics: card.mnemonic || card.mnemonics,
      }));

      const usage = this.extractUsage(response);
      const costCents = this.calculateCost(usage, finalConfig.model);

      return {
        cards: generatedCards,
        metadata: {
          model: finalConfig.model,
          provider: this.info.name,
          tokensUsed: usage.total,
          costCents,
          duration,
          requestId: `req_${Date.now()}`,
        },
        success: true,
      };
    } catch (error) {
      console.error("Gemini card generation error:", error);
      return {
        cards: [],
        metadata: {
          model: config?.model || this.info.models[0],
          provider: this.info.name,
          tokensUsed: 0,
          costCents: 0,
          duration: 0,
          requestId: `error_${Date.now()}`,
        },
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async generateDeck(
    request: DeckGenerationRequest,
    config?: Partial<ModelConfig>
  ): Promise<DeckGenerationResponse> {
    try {
      this.validateRequest(request);
      const finalConfig = this.mergeConfig(config);
      const { system, user } = buildDeckGenerationPrompt(request);

      const startTime = Date.now();
      const response = await this.generateContent(system, user, finalConfig, {
        maxTokens: this.calculateMaxTokens(request.cardCount, finalConfig.maxTokens),
      });
      const duration = Date.now() - startTime;
      const content = this.extractText(response);
      const parsed = this.parseJsonResponse(content);

      if (!parsed.deck || !Array.isArray(parsed.cards)) {
        throw new Error("Invalid deck generation response format");
      }

      const cards: GeneratedCard[] = parsed.cards.map((card: any) => ({
        type: "basic" as const,
        front: card.question || card.front,
        back: card.answer || card.back,
        advancedNotes: card.notes || card.advancedNotes,
        mnemonics: card.mnemonic || card.mnemonics,
      }));

      const usage = this.extractUsage(response);
      const costCents = this.calculateCost(usage, finalConfig.model);

      return {
        deck: {
          title: parsed.deck.title,
          description: parsed.deck.description,
          tags: parsed.deck.tags || [],
        },
        cards,
        metadata: {
          model: finalConfig.model,
          provider: this.info.name,
          tokensUsed: usage.total,
          costCents,
          duration,
          requestId: `req_${Date.now()}`,
        },
        success: true,
      };
    } catch (error) {
      console.error("Gemini deck generation error:", error);
      throw this.handleError(error, "generateDeck");
    }
  }

  async generateEventContent(
    request: EventGenerationRequest,
    config?: Partial<ModelConfig>
  ): Promise<CardGenerationResponse> {
    try {
      this.validateRequest(request);
      const finalConfig = this.mergeConfig(config);
      const { system, user } = buildEventPrompt(request);

      const response = await this.generateContent(system, user, finalConfig);
      const content = this.extractText(response);
      const parsed = this.parseJsonResponse(content);
      const cards = Array.isArray(parsed) ? parsed : parsed.cards || [];

      const generatedCards: GeneratedCard[] = cards.map((card: any) => ({
        type: "basic" as const,
        front: card.question || card.front,
        back: card.answer || card.back,
        advancedNotes: card.notes || card.advancedNotes,
        mnemonics: card.mnemonic || card.mnemonics,
      }));

      const usage = this.extractUsage(response);
      const costCents = this.calculateCost(usage, finalConfig.model);

      return {
        cards: generatedCards,
        metadata: {
          model: finalConfig.model,
          provider: this.info.name,
          tokensUsed: usage.total,
          costCents,
          duration: 0,
          requestId: `req_${Date.now()}`,
        },
        success: true,
      };
    } catch (error) {
      console.error("Gemini event generation error:", error);
      throw this.handleError(error, "generateEventContent");
    }
  }

  async enhanceCards(
    request: EnhancementRequest,
    config?: Partial<ModelConfig>
  ): Promise<CardGenerationResponse> {
    try {
      this.validateRequest(request);
      const finalConfig = this.mergeConfig(config);
      const { system, user } = buildEnhancementPrompt(request);

      const response = await this.generateContent(system, user, finalConfig);
      const content = this.extractText(response);
      const parsed = this.parseJsonResponse(content);
      const cards = Array.isArray(parsed) ? parsed : parsed.cards || [];

      const enhancedCards: GeneratedCard[] = cards.map((card: any) => ({
        type: "basic" as const,
        front: card.question || card.front,
        back: card.answer || card.back,
        advancedNotes: card.notes || card.advancedNotes,
        mnemonics: card.mnemonic || card.mnemonics,
      }));

      const usage = this.extractUsage(response);
      const costCents = this.calculateCost(usage, finalConfig.model);

      return {
        cards: enhancedCards,
        metadata: {
          model: finalConfig.model,
          provider: this.info.name,
          tokensUsed: usage.total,
          costCents,
          duration: 0,
          requestId: `req_${Date.now()}`,
        },
        success: true,
      };
    } catch (error) {
      console.error("Gemini enhancement error:", error);
      throw this.handleError(error, "enhanceCards");
    }
  }

  async estimateCost(
    prompt: string,
    expectedOutputTokens: number,
    model?: string
  ): Promise<number> {
    const selectedModel = model || this.info.models[0];
    const inputTokens = await this.countTokens(prompt, selectedModel);

    const usage: TokenUsage = {
      input: inputTokens,
      output: expectedOutputTokens,
      total: inputTokens + expectedOutputTokens,
    };

    return this.calculateCost(usage, selectedModel);
  }

  async countTokens(text: string, _model?: string): Promise<number> {
    return Math.ceil(text.length / 4);
  }

  async validateConfig(): Promise<boolean> {
    try {
      const model = this.defaultConfig.model || this.info.models[0];
      const url = `${GEMINI_API_BASE}/${model}?key=${this.apiKey}`;
      const response = await fetch(url);
      return response.ok;
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.generateContent(
        "You are a helpful assistant.",
        "Reply with a JSON object { \"hello\": \"world\" }",
        this.mergeConfig()
      );
      return true;
    } catch {
      return false;
    }
  }

  private async generateContent(
    system: string,
    user: string,
    config: ModelConfig,
    overrides?: Partial<ModelConfig>
  ): Promise<GeminiGenerationResponse> {
    const finalConfig = {
      ...config,
      ...overrides,
    };

    const generationConfig: Record<string, number | string | undefined> = {
      temperature: finalConfig.temperature,
      topP: finalConfig.topP,
      maxOutputTokens: finalConfig.maxTokens,
    };

    const body: Record<string, unknown> = {
      contents: [
        {
          role: "user",
          parts: [{ text: this.sanitizePrompt(user) }],
        },
      ],
      generationConfig: {
        ...Object.fromEntries(
          Object.entries(generationConfig).filter(([, value]) => value !== undefined)
        ),
        responseMimeType: "application/json",
      },
    };

    if (system) {
      body.systemInstruction = {
        role: "system",
        parts: [{ text: this.sanitizePrompt(system) }],
      };
    }

    const url = `${GEMINI_API_BASE}/${finalConfig.model}:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini request failed: ${errorBody || `${response.status} ${response.statusText}`}`);
    }

    return (await response.json()) as GeminiGenerationResponse;
  }

  private extractText(response: GeminiGenerationResponse): string {
    const text = response.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
    if (!text) {
      throw new Error("No response received from Gemini");
    }
    return text;
  }

  private extractUsage(response: GeminiGenerationResponse): TokenUsage {
    const usage = response.usageMetadata || {};
    const input = usage.promptTokenCount ?? 0;
    const output = usage.candidatesTokenCount ?? 0;
    const total = usage.totalTokenCount ?? input + output;
    return { input, output, total };
  }

  private calculateMaxTokens(cardCount: number, configMaxTokens?: number): number {
    const baseTokens = 500;
    const tokensPerCard = cardCount > 10 ? 250 : 400;
    const calculatedTokens = baseTokens + cardCount * tokensPerCard;
    const maxAllowed = Math.min(8192, configMaxTokens || 8192);
    return Math.min(calculatedTokens, maxAllowed);
  }
}

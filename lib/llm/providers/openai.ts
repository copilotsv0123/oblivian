/**
 * OpenAI provider implementation for LLM services
 */

import OpenAI from 'openai'
import { BaseLLMProvider } from './base-provider'
import {
  buildCardGenerationPrompt,
  buildDeckGenerationPrompt,
  buildEventPrompt,
  buildEnhancementPrompt,
  validateGeneratedCards
} from '../prompts/card-generation'
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
  GeneratedCard
} from '../types'

export class OpenAIProvider extends BaseLLMProvider {
  private client: OpenAI

  readonly info: LLMProvider = {
    name: 'openai',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
    costPer1KTokens: {
      input: 0.00015, // GPT-4o-mini pricing
      output: 0.0006
    }
  }

  constructor(apiKey: string, defaultConfig?: Partial<ModelConfig>) {
    super(apiKey, defaultConfig)

    this.client = new OpenAI({
      apiKey,
      timeout: 30000, // 30 second timeout
      maxRetries: 2
    })
  }

  async generateCards(
    request: CardGenerationRequest,
    config?: Partial<ModelConfig>
  ): Promise<CardGenerationResponse> {
    try {
      this.validateRequest(request)

      // For now, only support basic cards
      if (!request.cardTypes.includes('basic')) {
        throw new Error('Only basic card type is currently supported')
      }

      const finalConfig = this.mergeConfig(config)
      const { system, user } = buildCardGenerationPrompt({
        ...request,
        cardTypes: ['basic'] // Force basic cards only
      })

      const startTime = Date.now()

      const completion = await this.client.chat.completions.create({
        model: finalConfig.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: finalConfig.temperature,
        max_tokens: finalConfig.maxTokens,
        top_p: finalConfig.topP,
        response_format: { type: 'json_object' }
      })

      const duration = Date.now() - startTime

      if (!completion.choices[0]?.message?.content) {
        throw new Error('No response received from OpenAI')
      }

      // Parse the JSON response with robust handling
      let parsedResponse: any
      try {
        parsedResponse = this.parseJsonResponse(completion.choices[0].message.content)
      } catch (error) {
        throw new Error('Invalid JSON response from OpenAI')
      }

      // Extract cards array (handle different response formats)
      const cards = Array.isArray(parsedResponse) ? parsedResponse : parsedResponse.cards || []

      if (!validateGeneratedCards(cards)) {
        throw new Error('Generated cards do not match expected schema')
      }

      // Convert to our format and ensure all are basic cards
      const generatedCards: GeneratedCard[] = cards.map((card: any) => ({
        type: 'basic' as const,
        front: card.question || card.front,
        back: card.answer || card.back,
        advancedNotes: card.notes || card.advancedNotes,
        mnemonics: card.mnemonic || card.mnemonics
      }))

      const usage: TokenUsage = {
        input: completion.usage?.prompt_tokens || 0,
        output: completion.usage?.completion_tokens || 0,
        total: completion.usage?.total_tokens || 0
      }

      const costCents = this.calculateCost(usage, finalConfig.model)

      return {
        cards: generatedCards,
        metadata: {
          model: finalConfig.model,
          provider: this.info.name,
          tokensUsed: usage.total,
          costCents,
          duration,
          requestId: completion.id || `req_${Date.now()}`
        },
        success: true
      }

    } catch (error) {
      console.error('OpenAI card generation error:', error)
      return {
        cards: [],
        metadata: {
          model: config?.model || this.info.models[0],
          provider: this.info.name,
          tokensUsed: 0,
          costCents: 0,
          duration: 0,
          requestId: `error_${Date.now()}`
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  async generateDeck(
    request: DeckGenerationRequest,
    config?: Partial<ModelConfig>
  ): Promise<DeckGenerationResponse> {
    try {
      this.validateRequest(request)

      const finalConfig = this.mergeConfig(config)
      const { system, user } = buildDeckGenerationPrompt(request)

      const startTime = Date.now()

      const completion = await this.client.chat.completions.create({
        model: finalConfig.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: finalConfig.temperature,
        max_tokens: this.calculateMaxTokens(request.cardCount, finalConfig.maxTokens),
        top_p: finalConfig.topP,
        response_format: { type: 'json_object' }
      })

      const duration = Date.now() - startTime

      if (!completion.choices[0]?.message?.content) {
        throw new Error('No response received from OpenAI')
      }

      const parsedResponse = this.parseJsonResponse(completion.choices[0].message.content)


      if (!parsedResponse.deck || !Array.isArray(parsedResponse.cards)) {
        throw new Error('Invalid deck generation response format')
      }

      const cards: GeneratedCard[] = parsedResponse.cards.map((card: any) => ({
        type: 'basic' as const,
        front: card.question || card.front,
        back: card.answer || card.back,
        advancedNotes: card.notes || card.advancedNotes,
        mnemonics: card.mnemonic || card.mnemonics
      }))

      const usage: TokenUsage = {
        input: completion.usage?.prompt_tokens || 0,
        output: completion.usage?.completion_tokens || 0,
        total: completion.usage?.total_tokens || 0
      }

      const costCents = this.calculateCost(usage, finalConfig.model)

      return {
        deck: {
          title: parsedResponse.deck.title,
          description: parsedResponse.deck.description,
          tags: parsedResponse.deck.tags || []
        },
        cards,
        metadata: {
          model: finalConfig.model,
          provider: this.info.name,
          tokensUsed: usage.total,
          costCents,
          duration,
          requestId: completion.id || `req_${Date.now()}`
        },
        success: true
      }

    } catch (error) {
      console.error('OpenAI deck generation error:', error)
      throw this.handleError(error, 'generateDeck')
    }
  }

  async generateEventContent(
    request: EventGenerationRequest,
    config?: Partial<ModelConfig>
  ): Promise<CardGenerationResponse> {
    try {
      this.validateRequest(request)

      const finalConfig = this.mergeConfig(config)
      const { system, user } = buildEventPrompt(request)

      const completion = await this.client.chat.completions.create({
        model: finalConfig.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: finalConfig.temperature,
        max_tokens: finalConfig.maxTokens,
        top_p: finalConfig.topP,
        response_format: { type: 'json_object' }
      })

      if (!completion.choices[0]?.message?.content) {
        throw new Error('No response received from OpenAI')
      }

      const parsedResponse = this.parseJsonResponse(completion.choices[0].message.content)
      const cards = Array.isArray(parsedResponse) ? parsedResponse : parsedResponse.cards || []

      const generatedCards: GeneratedCard[] = cards.map((card: any) => ({
        type: 'basic' as const,
        front: card.question || card.front,
        back: card.answer || card.back,
        advancedNotes: card.notes || card.advancedNotes,
        mnemonics: card.mnemonic || card.mnemonics
      }))

      const usage: TokenUsage = {
        input: completion.usage?.prompt_tokens || 0,
        output: completion.usage?.completion_tokens || 0,
        total: completion.usage?.total_tokens || 0
      }

      return {
        cards: generatedCards,
        metadata: {
          model: finalConfig.model,
          provider: this.info.name,
          tokensUsed: usage.total,
          costCents: this.calculateCost(usage, finalConfig.model),
          duration: 0,
          requestId: completion.id || `req_${Date.now()}`
        },
        success: true
      }

    } catch (error) {
      console.error('OpenAI event generation error:', error)
      throw this.handleError(error, 'generateEventContent')
    }
  }

  async enhanceCards(
    request: EnhancementRequest,
    config?: Partial<ModelConfig>
  ): Promise<CardGenerationResponse> {
    try {
      this.validateRequest(request)

      const finalConfig = this.mergeConfig(config)
      const { system, user } = buildEnhancementPrompt(request)

      const completion = await this.client.chat.completions.create({
        model: finalConfig.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: finalConfig.temperature,
        max_tokens: finalConfig.maxTokens,
        top_p: finalConfig.topP,
        response_format: { type: 'json_object' }
      })

      if (!completion.choices[0]?.message?.content) {
        throw new Error('No response received from OpenAI')
      }

      const parsedResponse = this.parseJsonResponse(completion.choices[0].message.content)
      const cards = Array.isArray(parsedResponse) ? parsedResponse : parsedResponse.cards || []

      const enhancedCards: GeneratedCard[] = cards.map((card: any) => ({
        type: 'basic' as const,
        front: card.question || card.front,
        back: card.answer || card.back,
        advancedNotes: card.notes || card.advancedNotes,
        mnemonics: card.mnemonic || card.mnemonics
      }))

      const usage: TokenUsage = {
        input: completion.usage?.prompt_tokens || 0,
        output: completion.usage?.completion_tokens || 0,
        total: completion.usage?.total_tokens || 0
      }

      return {
        cards: enhancedCards,
        metadata: {
          model: finalConfig.model,
          provider: this.info.name,
          tokensUsed: usage.total,
          costCents: this.calculateCost(usage, finalConfig.model),
          duration: 0,
          requestId: completion.id || `req_${Date.now()}`
        },
        success: true
      }

    } catch (error) {
      console.error('OpenAI enhancement error:', error)
      throw this.handleError(error, 'enhanceCards')
    }
  }

  async estimateCost(
    prompt: string,
    expectedOutputTokens: number,
    model?: string
  ): Promise<number> {
    const selectedModel = model || this.info.models[0]
    const inputTokens = await this.countTokens(prompt, selectedModel)

    const usage: TokenUsage = {
      input: inputTokens,
      output: expectedOutputTokens,
      total: inputTokens + expectedOutputTokens
    }

    return this.calculateCost(usage, selectedModel)
  }

  async countTokens(text: string, model?: string): Promise<number> {
    // Rough estimation: ~4 characters per token for English text
    // This is a simplified approach; for production, consider using tiktoken
    return Math.ceil(text.length / 4)
  }

  async validateConfig(): Promise<boolean> {
    try {
      await this.client.models.list()
      return true
    } catch {
      return false
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      })
      return !!response.choices[0]?.message
    } catch {
      return false
    }
  }


  /**
   * Calculate appropriate max tokens based on card count
   */
  private calculateMaxTokens(cardCount: number, configMaxTokens?: number): number {
    // Base tokens for deck metadata + overhead
    const baseTokens = 500

    // Tokens per card: roughly 300-500 tokens per card with detailed notes
    const tokensPerCard = cardCount > 10 ? 250 : 400 // Shorter content for larger decks

    const calculatedTokens = baseTokens + (cardCount * tokensPerCard)

    // Cap at 8000 tokens (GPT-4o-mini's practical limit) or user's config
    const maxAllowed = Math.min(8000, configMaxTokens || 8000)

    return Math.min(calculatedTokens, maxAllowed)
  }

  /**
   * Get model-specific cost information
   */
  getModelCost(model: string): { input: number; output: number } | null {
    if (!this.supportsModel(model)) {
      return null
    }

    // Model-specific pricing
    const modelCosts: Record<string, { input: number; output: number }> = {
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
    }

    return modelCosts[model] || this.info.costPer1KTokens
  }
}
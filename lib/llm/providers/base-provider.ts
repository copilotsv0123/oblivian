/**
 * Base provider interface for LLM integrations
 */

import type {
  CardGenerationRequest,
  CardGenerationResponse,
  DeckGenerationRequest,
  DeckGenerationResponse,
  EventGenerationRequest,
  EnhancementRequest,
  ModelConfig,
  TokenUsage,
  LLMProvider
} from '../types'

export abstract class BaseLLMProvider {
  abstract readonly info: LLMProvider

  constructor(
    protected apiKey: string,
    protected defaultConfig: Partial<ModelConfig> = {}
  ) {}

  /**
   * Generate flashcards based on a topic
   */
  abstract generateCards(
    request: CardGenerationRequest,
    config?: Partial<ModelConfig>
  ): Promise<CardGenerationResponse>

  /**
   * Generate a complete deck with cards
   */
  abstract generateDeck(
    request: DeckGenerationRequest,
    config?: Partial<ModelConfig>
  ): Promise<DeckGenerationResponse>

  /**
   * Generate event-based content (today in history, seasonal, etc.)
   */
  abstract generateEventContent(
    request: EventGenerationRequest,
    config?: Partial<ModelConfig>
  ): Promise<CardGenerationResponse>

  /**
   * Enhance existing cards with additional content
   */
  abstract enhanceCards(
    request: EnhancementRequest,
    config?: Partial<ModelConfig>
  ): Promise<CardGenerationResponse>

  /**
   * Estimate cost for a generation request
   */
  abstract estimateCost(
    prompt: string,
    expectedOutputTokens: number,
    model?: string
  ): Promise<number>

  /**
   * Count tokens in a text string
   */
  abstract countTokens(text: string, model?: string): Promise<number>

  /**
   * Get available models for this provider
   */
  getModels(): string[] {
    return this.info.models
  }

  /**
   * Check if provider supports a specific model
   */
  supportsModel(model: string): boolean {
    return this.info.models.includes(model)
  }

  /**
   * Get cost information for a model
   */
  getModelCost(model: string): { input: number; output: number } | null {
    if (!this.supportsModel(model)) {
      return null
    }
    return this.info.costPer1KTokens
  }

  /**
   * Validate provider configuration
   */
  abstract validateConfig(): Promise<boolean>

  /**
   * Test provider connection
   */
  abstract testConnection(): Promise<boolean>

  /**
   * Calculate actual cost from token usage
   */
  calculateCost(usage: TokenUsage, model: string): number {
    const costs = this.getModelCost(model)
    if (!costs) {
      throw new Error(`Unknown model: ${model}`)
    }

    const inputCost = (usage.input / 1000) * costs.input
    const outputCost = (usage.output / 1000) * costs.output

    return Math.round((inputCost + outputCost) * 100) // Return cents
  }

  /**
   * Merge configurations with defaults
   */
  protected mergeConfig(config?: Partial<ModelConfig>): ModelConfig {
    return {
      provider: this.info.name,
      model: this.info.models[0], // Default to first model
      temperature: 0.7,
      maxTokens: 2000,
      topP: 1.0,
      ...this.defaultConfig,
      ...config
    }
  }

  /**
   * Validate request parameters
   */
  protected validateRequest(request: any): void {
    if (!request) {
      throw new Error('Request is required')
    }

    // Add common validation logic here
    if ('count' in request && (request.count < 1 || request.count > 50)) {
      throw new Error('Card count must be between 1 and 50')
    }

    if ('topic' in request && (!request.topic || request.topic.trim().length < 3)) {
      throw new Error('Topic must be at least 3 characters long')
    }
  }

  /**
   * Sanitize and prepare prompt
   */
  protected sanitizePrompt(prompt: string): string {
    return prompt
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .slice(0, 10000) // Limit prompt length
  }

  /**
   * Parse JSON response with robust handling of markdown formatting
   * This handles common LLM response formats like:
   * - Markdown code blocks (```json, ```, ```javascript)
   * - Markdown headers before JSON
   * - Extra text before/after JSON
   */
  protected parseJsonResponse(content: string): any {
    // Remove any markdown formatting that LLMs commonly add
    let cleanContent = content.trim()

    // Remove markdown titles/headers (e.g., "# Generated Cards" or "## Response")
    cleanContent = cleanContent.replace(/^#+\s*.*$/gm, '').trim()

    // Remove markdown code blocks with various formats:
    // ```json ... ```
    // ``` ... ```
    // ```javascript ... ```
    const codeBlockRegex = /```(?:json|javascript|js)?\s*([\s\S]*?)\s*```/g
    const codeBlockMatch = codeBlockRegex.exec(cleanContent)

    if (codeBlockMatch) {
      cleanContent = codeBlockMatch[1].trim()
    }

    // Remove any remaining markdown formatting
    cleanContent = cleanContent.replace(/^\s*```\s*/gm, '').replace(/\s*```\s*$/gm, '')

    // Remove any text before the first { or [
    const jsonStart = Math.min(
      cleanContent.indexOf('{') === -1 ? Infinity : cleanContent.indexOf('{'),
      cleanContent.indexOf('[') === -1 ? Infinity : cleanContent.indexOf('[')
    )

    if (jsonStart !== Infinity && jsonStart > 0) {
      cleanContent = cleanContent.substring(jsonStart)
    }

    // Remove any text after the last } or ]
    const lastBrace = Math.max(cleanContent.lastIndexOf('}'), cleanContent.lastIndexOf(']'))
    if (lastBrace !== -1 && lastBrace < cleanContent.length - 1) {
      cleanContent = cleanContent.substring(0, lastBrace + 1)
    }

    try {
      return JSON.parse(cleanContent)
    } catch (error) {
      // Check if response was likely truncated
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (errorMessage.includes("Expected ',' or ']'") ||
          errorMessage.includes("Expected '}' or ','") ||
          errorMessage.includes("Unexpected end of JSON")) {
        throw new Error(`Response appears to be truncated. Try reducing card count or increasing token limit. Original error: ${errorMessage}`)
      }

      // If all else fails, try to extract JSON from anywhere in the content
      const jsonRegex = /(\{[\s\S]*\}|\[[\s\S]*\])/
      const match = content.match(jsonRegex)
      if (match) {
        try {
          return JSON.parse(match[1])
        } catch (secondError) {
          const secondErrorMessage = secondError instanceof Error ? secondError.message : 'Unknown error'
          if (secondErrorMessage.includes("Expected ',' or ']'") ||
              secondErrorMessage.includes("Expected '}' or ','") ||
              secondErrorMessage.includes("Unexpected end of JSON")) {
            throw new Error(`Response appears to be truncated. Try reducing card count or increasing token limit.`)
          }
          throw new Error(`Failed to parse JSON: ${secondErrorMessage}`)
        }
      }
      throw new Error(`Failed to parse JSON: ${errorMessage}`)
    }
  }

  /**
   * Handle provider-specific errors
   */
  protected handleError(error: any, context: string): never {
    console.error(`${this.info.name} provider error in ${context}:`, error)

    // Rethrow with context
    if (error.message?.includes('rate limit')) {
      throw new Error(`Rate limit exceeded for ${this.info.name}. Please try again later.`)
    }

    if (error.message?.includes('quota')) {
      throw new Error(`API quota exceeded for ${this.info.name}. Please check your billing.`)
    }

    if (error.message?.includes('invalid')) {
      throw new Error(`Invalid request to ${this.info.name}: ${error.message}`)
    }

    if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
      throw new Error(`Request timed out for ${this.info.name}. Try reducing card count or try again later.`)
    }

    throw new Error(`${this.info.name} provider error: ${error.message || 'Unknown error'}`)
  }
}
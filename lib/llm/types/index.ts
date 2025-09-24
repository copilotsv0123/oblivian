/**
 * Core types for LLM service layer
 */

// Card generation types
export type CardType = 'basic' // Start with basic cards only

export interface Choice {
  text: string
  isCorrect: boolean
}

export interface GeneratedCard {
  type: CardType
  front: string
  back?: string
  choices?: Choice[]
  explanation?: string
  advancedNotes?: string
  mnemonics?: string
}

// Generation request types
export interface CardGenerationRequest {
  topic: string
  count: number
  cardTypes: CardType[]
  difficulty: 'simple' | 'intermediate' | 'advanced'
  language: string
  context?: string
  existingCards?: string[] // For avoiding duplication
}

export interface DeckGenerationRequest {
  topic: string
  description?: string
  cardCount: number
  difficulty: 'simple' | 'intermediate' | 'advanced'
  language: string
  tags?: string[]
  targetAudience?: string
}

export interface EventGenerationRequest {
  eventType: 'today' | 'seasonal' | 'trending' | 'custom'
  customPrompt?: string
  date?: Date
  difficulty: 'simple' | 'intermediate' | 'advanced'
  language: string
}

export interface EnhancementRequest {
  existingCards: GeneratedCard[]
  enhancementType: 'mnemonics' | 'examples' | 'context' | 'advanced_notes'
}

// Generation response types
export interface GenerationMetadata {
  model: string
  provider: string
  tokensUsed: number
  costCents: number
  duration: number
  requestId: string
}

export interface CardGenerationResponse {
  cards: GeneratedCard[]
  metadata: GenerationMetadata
  success: boolean
  error?: string
}

export interface DeckGenerationResponse {
  deck: {
    title: string
    description: string
    tags: string[]
  }
  cards: GeneratedCard[]
  metadata: GenerationMetadata
  success: boolean
  error?: string
}

// Provider types
export interface LLMProvider {
  name: string
  models: string[]
  costPer1KTokens: {
    input: number
    output: number
  }
}

export interface ModelConfig {
  provider: string
  model: string
  temperature?: number
  maxTokens?: number
  topP?: number
}

// Usage tracking types
export interface TokenUsage {
  input: number
  output: number
  total: number
}

export interface GenerationRecord {
  id: string
  userId: string
  type: 'cards' | 'deck' | 'event' | 'enhance'
  inputData: Record<string, any>
  outputData?: Record<string, any>
  modelUsed: string
  tokensUsed: TokenUsage
  costCents: number
  status: 'pending' | 'completed' | 'failed'
  errorMessage?: string
  createdAt: Date
  completedAt?: Date
}

export interface UsageStats {
  period: string // YYYY-MM format
  totalRequests: number
  totalTokens: number
  totalCostCents: number
  requestsByType: Record<string, number>
  averageCostPerRequest: number
  successRate: number
}

// User tier types
export interface UserTier {
  name: 'free' | 'premium' | 'unlimited'
  monthlyRequestLimit: number
  monthlyTokenLimit: number
  maxCardsPerGeneration: number
  allowedModels: string[]
  cooldownMinutes: number
  features: string[]
}

// Error types
export class LLMError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: string,
    public model?: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'LLMError'
  }
}

export class RateLimitError extends LLMError {
  constructor(message: string, public retryAfter?: number) {
    super(message, 'RATE_LIMIT')
    this.name = 'RateLimitError'
  }
}

export class QuotaExceededError extends LLMError {
  constructor(message: string, public currentUsage: number, public limit: number) {
    super(message, 'QUOTA_EXCEEDED')
    this.name = 'QuotaExceededError'
  }
}

export class InvalidPromptError extends LLMError {
  constructor(message: string, public prompt?: string) {
    super(message, 'INVALID_PROMPT')
    this.name = 'InvalidPromptError'
  }
}
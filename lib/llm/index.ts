/**
 * LLM service layer exports
 */

// Main service
export { llmService, LLMService } from './services/llm-service'

// Types
export type {
  CardType,
  Choice,
  GeneratedCard,
  CardGenerationRequest,
  DeckGenerationRequest,
  EventGenerationRequest,
  EnhancementRequest,
  CardGenerationResponse,
  DeckGenerationResponse,
  GenerationMetadata,
  LLMProvider,
  ModelConfig,
  TokenUsage,
  GenerationRecord,
  UsageStats,
  UserTier
} from './types'

// Error classes
export {
  LLMError,
  RateLimitError,
  QuotaExceededError,
  InvalidPromptError
} from './types'

// Providers
export { BaseLLMProvider } from './providers/base-provider'
export { OpenAIProvider } from './providers/openai'

// Prompts
export {
  buildCardGenerationPrompt,
  buildDeckGenerationPrompt,
  buildEventPrompt,
  buildEnhancementPrompt,
  validateGeneratedCards
} from './prompts/card-generation'
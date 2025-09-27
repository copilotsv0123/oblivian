/**
 * API endpoint for generating complete decks using LLM service
 */

import { llmService } from '@/lib/llm'
import type { DeckGenerationRequest, ModelConfig } from '@/lib/llm'
import { ApiError, withApiHandler, type ApiContext } from '@/lib/middleware/api-wrapper'

async function generateDeckHandler(context: ApiContext) {
  const body = await context.request.json()

  // Extract request data
  const {
    topic,
    description,
    cardCount,
    difficulty = 'intermediate',
    language = 'en',
    targetAudience,
    tags,
    ...modelConfig
  }: DeckGenerationRequest & Partial<ModelConfig> = body

  // Validate required fields
  if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
    throw new ApiError('Topic is required and must be at least 3 characters long', 400)
  }

  if (!cardCount || cardCount < 3 || cardCount > 25) {
    throw new ApiError('Card count must be between 3 and 25', 400)
  }

  // Prepare the request
  const generationRequest: DeckGenerationRequest = {
    topic: topic.trim(),
    description: description?.trim(),
    cardCount,
    difficulty,
    language,
    targetAudience: targetAudience?.trim(),
    tags: tags?.filter((tag: string) => tag && tag.trim().length > 0).map((tag: string) => tag.trim())
  }

  // Extract model configuration
  const config: Partial<ModelConfig> = {
    provider: modelConfig.provider,
    model: modelConfig.model,
    temperature: modelConfig.temperature,
    maxTokens: modelConfig.maxTokens,
    topP: modelConfig.topP
  }

  // Generate deck using the LLM service with userId for usage tracking
  const response = await llmService.generateDeck(generationRequest, config, context.user.id)

  return response
}

export const POST = withApiHandler(generateDeckHandler)
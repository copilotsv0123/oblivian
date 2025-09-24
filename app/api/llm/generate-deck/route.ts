/**
 * API endpoint for generating complete decks using LLM service
 */

import { NextRequest, NextResponse } from 'next/server'
import { llmService } from '@/lib/llm'
import type { DeckGenerationRequest, ModelConfig } from '@/lib/llm'
import { ApiError } from '@/lib/middleware/api-wrapper'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

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

    // Generate deck using the LLM service
    const response = await llmService.generateDeck(generationRequest, config)

    return NextResponse.json(response)

  } catch (error) {
    console.error('Deck generation API error:', error)

    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, success: false },
        { status: error.statusCode }
      )
    }

    // Handle LLM service errors
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message, success: false },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    )
  }
}
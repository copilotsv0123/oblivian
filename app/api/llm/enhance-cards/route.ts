/**
 * API endpoint for enhancing existing cards using LLM service
 */

import { NextRequest, NextResponse } from 'next/server'
import { llmService } from '@/lib/llm'
import type { EnhancementRequest, ModelConfig, GeneratedCard } from '@/lib/llm'
import { ApiError } from '@/lib/middleware/api-wrapper'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Extract request data
    const {
      existingCards,
      enhancementType = 'advanced_notes',
      ...modelConfig
    }: EnhancementRequest & Partial<ModelConfig> = body

    // Validate existing cards
    if (!existingCards || !Array.isArray(existingCards) || existingCards.length === 0) {
      throw new ApiError('Existing cards array is required and must not be empty', 400)
    }

    if (existingCards.length > 10) {
      throw new ApiError('Cannot enhance more than 10 cards at once', 400)
    }

    // Validate enhancement type
    const validEnhancementTypes = ['mnemonics', 'examples', 'context', 'advanced_notes']
    if (!validEnhancementTypes.includes(enhancementType)) {
      throw new ApiError(`Enhancement type must be one of: ${validEnhancementTypes.join(', ')}`, 400)
    }

    // Validate card structure
    for (let i = 0; i < existingCards.length; i++) {
      const card = existingCards[i]
      if (!card.front || typeof card.front !== 'string' || card.front.trim().length === 0) {
        throw new ApiError(`Card ${i + 1}: front field is required and must be a non-empty string`, 400)
      }
    }

    // Prepare the request
    const enhancementRequest: EnhancementRequest = {
      existingCards: existingCards.map((card: any): GeneratedCard => ({
        type: 'basic',
        front: card.front.trim(),
        back: card.back?.trim(),
        advancedNotes: card.advancedNotes?.trim(),
        mnemonics: card.mnemonics?.trim()
      })),
      enhancementType
    }

    // Extract model configuration
    const config: Partial<ModelConfig> = {
      provider: modelConfig.provider,
      model: modelConfig.model,
      temperature: modelConfig.temperature,
      maxTokens: modelConfig.maxTokens,
      topP: modelConfig.topP
    }

    // Enhance cards using the LLM service
    const response = await llmService.enhanceCards(enhancementRequest, config)

    return NextResponse.json(response)

  } catch (error) {
    console.error('Card enhancement API error:', error)

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
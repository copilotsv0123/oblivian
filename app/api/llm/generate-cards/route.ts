/**
 * API endpoint for generating flashcards using LLM service
 * Note: Temporarily public for testing - add auth before production
 */

import { NextRequest, NextResponse } from 'next/server'
import { llmService } from '@/lib/llm'
import type { CardGenerationRequest, ModelConfig } from '@/lib/llm'
import { ApiError } from '@/lib/middleware/api-wrapper'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Extract request data
    const {
      topic,
      count,
      difficulty = 'intermediate',
      language = 'en',
      cardTypes = ['basic'],
      context,
      existingCards,
      ...modelConfig
    }: CardGenerationRequest & Partial<ModelConfig> = body

    // Validate required fields
    if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
      throw new ApiError('Topic is required and must be at least 3 characters long', 400)
    }

    if (!count || count < 1 || count > 25) {
      throw new ApiError('Count must be between 1 and 25', 400)
    }

    // Prepare the request
    const generationRequest: CardGenerationRequest = {
      topic: topic.trim(),
      count,
      difficulty,
      language,
      cardTypes,
      context,
      existingCards
    }

    // Extract model configuration
    const config: Partial<ModelConfig> = {
      provider: modelConfig.provider,
      model: modelConfig.model,
      temperature: modelConfig.temperature,
      maxTokens: modelConfig.maxTokens,
      topP: modelConfig.topP
    }

    // Generate cards using the LLM service
    const response = await llmService.generateCards(generationRequest, config)

    return NextResponse.json(response)

  } catch (error) {
    console.error('Card generation API error:', error)

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
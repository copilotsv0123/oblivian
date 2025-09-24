/**
 * API endpoint for generating event-based content using LLM service
 */

import { NextRequest, NextResponse } from 'next/server'
import { llmService } from '@/lib/llm'
import type { EventGenerationRequest, ModelConfig } from '@/lib/llm'
import { ApiError } from '@/lib/middleware/api-wrapper'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Extract request data
    const {
      eventType = 'today',
      date,
      customPrompt,
      difficulty = 'intermediate',
      language = 'en',
      ...modelConfig
    }: EventGenerationRequest & Partial<ModelConfig> = body

    // Validate event type
    const validEventTypes = ['today', 'seasonal', 'trending', 'custom']
    if (!validEventTypes.includes(eventType)) {
      throw new ApiError(`Event type must be one of: ${validEventTypes.join(', ')}`, 400)
    }

    // Validate custom prompt for custom events
    if (eventType === 'custom' && (!customPrompt || typeof customPrompt !== 'string' || customPrompt.trim().length < 10)) {
      throw new ApiError('Custom prompt is required for custom events and must be at least 10 characters long', 400)
    }

    // Prepare the request
    const generationRequest: EventGenerationRequest = {
      eventType,
      date: date ? new Date(date) : new Date(),
      customPrompt: customPrompt?.trim(),
      difficulty,
      language
    }

    // Extract model configuration
    const config: Partial<ModelConfig> = {
      provider: modelConfig.provider,
      model: modelConfig.model,
      temperature: modelConfig.temperature,
      maxTokens: modelConfig.maxTokens,
      topP: modelConfig.topP
    }

    // Generate event content using the LLM service
    const response = await llmService.generateEventContent(generationRequest, config)

    return NextResponse.json(response)

  } catch (error) {
    console.error('Event generation API error:', error)

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
/**
 * Prompt templates for card generation
 */

import type { CardType, CardGenerationRequest, DeckGenerationRequest, EventGenerationRequest, EnhancementRequest } from '../types'

export interface PromptTemplate {
  system: string
  user: string
}

/**
 * Build card generation prompt
 */
export function buildCardGenerationPrompt(request: CardGenerationRequest): PromptTemplate {
  const cardTypesDescription = request.cardTypes.map(type => {
    if (type === 'basic') {
      return 'Basic cards: Simple question/answer format with front and back'
    }
    return `${type} cards`
  }).join(', ')

  const difficultyGuidelines = {
    simple: 'Use clear, straightforward language. Focus on fundamental concepts and basic understanding.',
    intermediate: 'Include some technical terms and require deeper understanding. Connect concepts.',
    advanced: 'Use sophisticated vocabulary. Require critical thinking and complex reasoning.'
  }

  const system = `You are an expert educational content creator specializing in spaced repetition flashcards.

Your task is to generate high-quality educational flashcards that:
- Are pedagogically sound and promote active recall
- Use appropriate difficulty level for the target audience
- Avoid ambiguous or trick questions
- Include rich context and explanations
- Support long-term retention through effective spacing

Card Types Available: ${cardTypesDescription}

Difficulty Level: ${request.difficulty}
Guidelines: ${difficultyGuidelines[request.difficulty]}

Output Requirements:
- Return a valid JSON array of card objects
- Each card must have the exact structure specified
- Ensure content is accurate and educationally valuable
- Make cards complement each other without duplication
- Include mnemonics when they would genuinely help memory retention`

  const existingCardsContext = request.existingCards && request.existingCards.length > 0
    ? `\n\nExisting cards in this deck (avoid duplication):\n${request.existingCards.join('\n')}`
    : ''

  const contextInfo = request.context
    ? `\n\nAdditional context: ${request.context}`
    : ''

  const user = `Generate ${request.count} educational flashcards about "${request.topic}".

Language: ${request.language}
Card types to create: ${request.cardTypes.join(', ')}
Difficulty: ${request.difficulty}${contextInfo}${existingCardsContext}

Return a JSON array with this exact structure:
[
  {
    "type": "basic",
    "front": "Question or prompt text",
    "back": "Answer text (50-150 words)",
    "advancedNotes": "Additional context, connections, or deeper insights (100-300 words)",
    "mnemonics": "Memory aid or technique when helpful (optional)"
  }
]

Guidelines:
1. Front: Clear, specific questions that test understanding
2. Back: Concise, accurate answers (20-60 words max)
3. Advanced Notes: Brief context or deeper insight (1-2 sentences max)
4. Mnemonics: Only include when genuinely helpful for memory retention
5. Avoid ambiguous phrasing or trick questions
6. Focus on conceptual understanding over rote memorization

Generate the cards now:`

  return { system, user }
}

/**
 * Build deck generation prompt
 */
export function buildDeckGenerationPrompt(request: DeckGenerationRequest): PromptTemplate {
  const difficultyGuidelines = {
    simple: 'Focus on fundamental concepts, clear definitions, and basic understanding.',
    intermediate: 'Include applications, connections between concepts, and some technical depth.',
    advanced: 'Require critical thinking, complex reasoning, and sophisticated understanding.'
  }

  const system = `You are an expert curriculum designer creating comprehensive learning decks.

Your task is to design a complete learning sequence that:
- Follows logical progression from basics to advanced concepts
- Includes diverse card types for varied learning experiences
- Builds understanding systematically
- Provides rich educational context
- Supports mastery through spaced repetition

Create a balanced deck with:
- 40% foundational concepts (basic understanding)
- 30% application and examples (practical usage)
- 20% connections and relationships (conceptual linking)
- 10% advanced insights (deeper understanding)`

  const audienceInfo = request.targetAudience
    ? `\nTarget audience: ${request.targetAudience}`
    : ''

  const tagsInfo = request.tags && request.tags.length > 0
    ? `\nSuggested tags: ${request.tags.join(', ')}`
    : ''

  const user = `Create a comprehensive learning deck about "${request.topic}".

Description: ${request.description || 'A comprehensive study deck'}
Number of cards: ${request.cardCount}
Difficulty: ${request.difficulty}
Language: ${request.language}${audienceInfo}${tagsInfo}

Guidelines: ${difficultyGuidelines[request.difficulty]}

${request.cardCount > 10 ? 'IMPORTANT: Since you are creating many cards, keep all content very concise. Back: 20-40 words max. AdvancedNotes: 1 short sentence max.' : ''}

Return a JSON object with this exact structure:
{
  "deck": {
    "title": "Engaging deck title",
    "description": "Clear description of what learners will master",
    "tags": ["relevant", "tags", "for", "categorization"]
  },
  "cards": [
    {
      "type": "basic",
      "front": "Question or prompt text",
      "back": "Answer text (20-60 words max)",
      "advancedNotes": "Additional context or deeper insight (1-2 sentences max)",
      "mnemonics": "Memory aid or technique when helpful (optional)"
    }
  ]
}

Ensure the deck:
1. Follows a logical learning progression
2. Uses basic card type with varied question styles
3. Includes comprehensive advanced notes for deeper learning
4. Provides memorable mnemonics where appropriate
5. Covers the topic thoroughly but concisely
6. Maintains educational value throughout

Generate the complete deck now:`

  return { system, user }
}

/**
 * Build event-based generation prompt
 */
export function buildEventPrompt(request: EventGenerationRequest): PromptTemplate {
  const currentDate = request.date || new Date()
  const dateStr = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  let eventContext = ''

  switch (request.eventType) {
    case 'today':
      eventContext = `Today's date: ${dateStr}
Focus on: Historical events, scientific discoveries, cultural milestones, or notable births/deaths that occurred on this date throughout history.`
      break
    case 'seasonal':
      const season = getSeason(currentDate)
      eventContext = `Current date: ${dateStr}
Season: ${season}
Focus on: Seasonal phenomena, cultural traditions, historical events specific to this time of year, or concepts that relate to the current season.`
      break
    case 'trending':
      eventContext = `Current date: ${dateStr}
Focus on: Educational content related to current trends, recent scientific discoveries, ongoing global events, or contemporary cultural phenomena that have educational value.`
      break
    case 'custom':
      eventContext = request.customPrompt || 'Create educational content based on the specified topic.'
      break
  }

  const system = `You are an expert educational content creator specializing in making current events and historical connections educational and memorable.

Your task is to create engaging flashcards that:
- Connect current dates/events to educational content
- Make learning relevant and timely
- Provide historical context and connections
- Inspire curiosity about the world
- Use the power of temporal anchoring for better memory retention

Focus on accuracy, educational value, and interesting connections that learners wouldn't typically encounter.`

  const user = `Create educational flashcards for today's learning session.

${eventContext}

Language: ${request.language}
Difficulty: ${request.difficulty}

Requirements:
- Generate 5-10 high-quality educational cards
- Mix different card types for variety
- Ensure historical accuracy and educational value
- Include fascinating details that spark curiosity
- Connect to broader educational themes when possible
- Provide rich context in advanced notes

Return the same JSON array structure as standard card generation.

Generate the event-based cards now:`

  return { system, user }
}

/**
 * Build enhancement prompt for existing cards
 */
export function buildEnhancementPrompt(request: EnhancementRequest): PromptTemplate {
  const enhancementDescriptions = {
    mnemonics: 'Create memorable mnemonics, acronyms, or memory techniques',
    examples: 'Add practical examples, analogies, or real-world applications',
    context: 'Provide historical context, background information, or broader connections',
    advanced_notes: 'Expand with deeper insights, technical details, or related concepts'
  }

  const system = `You are an expert learning enhancement specialist focused on improving educational content for better retention and understanding.

Your task is to enhance existing flashcards by adding ${enhancementDescriptions[request.enhancementType]}.

Guidelines:
- Preserve the original educational intent
- Add value without overwhelming the learner
- Ensure enhancements are accurate and relevant
- Make content more memorable and engaging
- Maintain appropriate difficulty level`

  const cardsContext = request.existingCards.map((card, index) =>
    `Card ${index + 1}:
Front: ${card.front}
Back: ${card.back || 'N/A'}
Current Advanced Notes: ${card.advancedNotes || 'None'}
Current Mnemonics: ${card.mnemonics || 'None'}`
  ).join('\n\n')

  const user = `Enhance these existing flashcards by adding ${request.enhancementType}:

${cardsContext}

Enhancement type: ${request.enhancementType}
Focus: ${enhancementDescriptions[request.enhancementType]}

Return a JSON array with the enhanced cards, maintaining the same structure but with improved content in the relevant fields.

For ${request.enhancementType} enhancement:
${request.enhancementType === 'mnemonics' ? '- Create memorable acronyms, rhymes, or visualization techniques\n- Only add mnemonics that genuinely help memory retention\n- Make them fun and easy to remember' : ''}
${request.enhancementType === 'examples' ? '- Add concrete, relatable examples\n- Include real-world applications\n- Use analogies that clarify difficult concepts' : ''}
${request.enhancementType === 'context' ? '- Provide historical or cultural background\n- Show connections to other topics\n- Explain why the concept matters' : ''}
${request.enhancementType === 'advanced_notes' ? '- Add deeper technical insights\n- Include advanced applications\n- Connect to related advanced concepts' : ''}

Generate the enhanced cards now:`

  return { system, user }
}

/**
 * Helper function to determine season
 */
function getSeason(date: Date): string {
  const month = date.getMonth() + 1

  if (month >= 3 && month <= 5) return 'Spring'
  if (month >= 6 && month <= 8) return 'Summer'
  if (month >= 9 && month <= 11) return 'Fall/Autumn'
  return 'Winter'
}

/**
 * Validate generated cards against expected schema
 */
export function validateGeneratedCards(cards: any[]): boolean {
  if (!Array.isArray(cards)) {
    return false
  }

  return cards.every(card => {
    if (!card.type || !card.front) {
      return false
    }

    // Only basic cards are supported for now
    if (card.type !== 'basic') {
      return false
    }

    // Basic cards must have a back field
    return typeof card.back === 'string' && card.back.length > 0
  })
}
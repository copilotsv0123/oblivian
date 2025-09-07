import { NextRequest, NextResponse } from 'next/server'
import { db, cards, decks } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth/middleware'
import { eq, and } from 'drizzle-orm'
import { CreateCardInput, Card } from '@/lib/types/cards'
import { transformDbCardsToApiCards } from '@/lib/db/transformers'
import { 
  handleApiError, 
  ValidationError, 
  NotFoundError,
  UnauthorizedError 
} from '@/lib/errors/api-error'

interface BatchImportRequest {
  deckId: string
  cards: CreateCardInput[]
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      throw new UnauthorizedError()
    }

    const body: BatchImportRequest = await request.json()
    const { deckId, cards: cardInputs } = body

    if (!deckId || !cardInputs || !Array.isArray(cardInputs)) {
      throw new ValidationError('deckId and cards array are required')
    }

    if (cardInputs.length === 0) {
      throw new ValidationError('At least one card is required')
    }

    if (cardInputs.length > 100) {
      throw new ValidationError('Maximum 100 cards can be imported at once')
    }

    const deck = await db
      .select()
      .from(decks)
      .where(and(eq(decks.id, deckId), eq(decks.ownerUserId, user.id)))
      .get()

    if (!deck) {
      throw new NotFoundError('Deck not found or unauthorized')
    }

    const validationErrors: Record<number, string> = {}
    
    cardInputs.forEach((card, index) => {
      if (!card.type || !card.front) {
        validationErrors[index] = 'type and front are required'
        return
      }

      if (card.type === 'basic' || card.type === 'cloze') {
        if (!card.back) {
          validationErrors[index] = `Back content is required for ${card.type} cards`
        }
      }

      if (card.type === 'multiple_choice') {
        if (!card.choices || card.choices.length < 2) {
          validationErrors[index] = 'At least 2 choices are required for multiple choice cards'
        } else {
          const correctChoices = card.choices.filter(c => c.isCorrect)
          if (correctChoices.length !== 1) {
            validationErrors[index] = 'Exactly one choice must be marked as correct'
          }
        }
      }

      if (card.type === 'explain' && !card.explanation) {
        validationErrors[index] = 'Explanation is required for explain cards'
      }
    })

    if (Object.keys(validationErrors).length > 0) {
      throw new ValidationError('Some cards have validation errors', validationErrors)
    }

    const cardsToInsert = cardInputs.map(card => ({
      deckId,
      type: card.type,
      front: card.front,
      back: card.back || null,
      choices: card.choices ? JSON.stringify(card.choices) : null,
      explanation: card.explanation || null,
    }))

    const insertedCards = await db
      .insert(cards)
      .values(cardsToInsert)
      .returning()

    const transformedCards = transformDbCardsToApiCards(insertedCards)

    return NextResponse.json({
      success: true,
      count: transformedCards.length,
      cards: transformedCards,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
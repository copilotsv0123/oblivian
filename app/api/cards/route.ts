import { NextRequest, NextResponse } from 'next/server'
import { db, cards, decks } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth/middleware'
import { eq, and } from 'drizzle-orm'
import { CreateCardInput } from '@/lib/types/cards'
import { transformDbCardToApiCard } from '@/lib/db/transformers'

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const input: CreateCardInput = await request.json()
    const { deckId, type, front, back, choices, explanation } = input

    if (!deckId || !type || !front) {
      return NextResponse.json(
        { error: 'deckId, type, and front are required' },
        { status: 400 }
      )
    }

    const deck = await db
      .select()
      .from(decks)
      .where(and(eq(decks.id, deckId), eq(decks.ownerUserId, user.id)))
      .get()

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck not found or unauthorized' },
        { status: 404 }
      )
    }

    if (type === 'basic' || type === 'cloze') {
      if (!back) {
        return NextResponse.json(
          { error: 'Back content is required for basic and cloze cards' },
          { status: 400 }
        )
      }
    }

    if (type === 'multiple_choice') {
      if (!choices || choices.length < 2) {
        return NextResponse.json(
          { error: 'At least 2 choices are required for multiple choice cards' },
          { status: 400 }
        )
      }
      const correctChoices = choices.filter(c => c.isCorrect)
      if (correctChoices.length !== 1) {
        return NextResponse.json(
          { error: 'Exactly one choice must be marked as correct' },
          { status: 400 }
        )
      }
    }

    if (type === 'explain' && !explanation) {
      return NextResponse.json(
        { error: 'Explanation is required for explain cards' },
        { status: 400 }
      )
    }

    const [newCard] = await db.insert(cards).values({
      deckId,
      type,
      front,
      back: back || null,
      choices: choices ? JSON.stringify(choices) : null,
      explanation: explanation || null,
    }).returning()

    const transformedCard = transformDbCardToApiCard(newCard)
    return NextResponse.json({ card: transformedCard })
  } catch (error) {
    console.error('Error creating card:', error)
    return NextResponse.json(
      { error: 'Failed to create card' },
      { status: 500 }
    )
  }
}
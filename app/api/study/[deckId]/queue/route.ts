import { NextRequest, NextResponse } from 'next/server'
import { db, cards, decks } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth/middleware'
import { getDueCards } from '@/lib/fsrs/scheduler'
import { eq, and, inArray } from 'drizzle-orm'
import { transformDbCardsToApiCards } from '@/lib/db/transformers'
import { checkDailyLoadWarning } from '@/lib/study/scoring'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { deckId } = await params
    
    const deck = await db
      .select()
      .from(decks)
      .where(eq(decks.id, deckId))
      .get()

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const queue = await getDueCards(user.id, deckId, limit)
    
    const allCardIds = [...queue.due, ...queue.new]
    
    if (allCardIds.length === 0) {
      return NextResponse.json({
        cards: [],
        stats: {
          due: 0,
          new: 0,
          total: 0,
        },
      })
    }

    const queueCards = await db
      .select()
      .from(cards)
      .where(inArray(cards.id, allCardIds))
      .all()

    const transformedCards = transformDbCardsToApiCards(queueCards)
    const cardMap = new Map(transformedCards.map(c => [c.id, c]))
    const orderedCards = allCardIds
      .map(id => cardMap.get(id))
      .filter(Boolean)

    // Check for daily load warning
    const warning = await checkDailyLoadWarning(user.id, deckId)

    return NextResponse.json({
      cards: orderedCards,
      stats: {
        due: queue.due.length,
        new: queue.new.length,
        total: orderedCards.length,
      },
      warning,
    })
  } catch (error) {
    console.error('Error fetching study queue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch study queue' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { db, cards, decks } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth/middleware'
import { eq, and } from 'drizzle-orm'
import { transformDbCardToApiCard } from '@/lib/db/transformers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const card = await db
      .select({
        card: cards,
        deck: decks,
      })
      .from(cards)
      .innerJoin(decks, eq(cards.deckId, decks.id))
      .where(and(eq(cards.id, id), eq(decks.ownerUserId, user.id)))
      .get()

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    const transformedCard = transformDbCardToApiCard(card.card)
    return NextResponse.json({ card: transformedCard, deck: card.deck })
  } catch (error) {
    console.error('Error fetching card:', error)
    return NextResponse.json(
      { error: 'Failed to fetch card' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { front, back, choices, explanation } = await request.json()

    const existingCard = await db
      .select({
        card: cards,
        deck: decks,
      })
      .from(cards)
      .innerJoin(decks, eq(cards.deckId, decks.id))
      .where(and(eq(cards.id, id), eq(decks.ownerUserId, user.id)))
      .get()

    if (!existingCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    const [updatedCard] = await db
      .update(cards)
      .set({
        front,
        back,
        choices: choices ? JSON.stringify(choices) : undefined,
        explanation,
        updatedAt: new Date(),
      })
      .where(eq(cards.id, id))
      .returning()

    const transformedCard = transformDbCardToApiCard(updatedCard)
    return NextResponse.json({ card: transformedCard })
  } catch (error) {
    console.error('Error updating card:', error)
    return NextResponse.json(
      { error: 'Failed to update card' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const existingCard = await db
      .select({
        card: cards,
        deck: decks,
      })
      .from(cards)
      .innerJoin(decks, eq(cards.deckId, decks.id))
      .where(and(eq(cards.id, id), eq(decks.ownerUserId, user.id)))
      .get()

    if (!existingCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    await db.delete(cards).where(eq(cards.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting card:', error)
    return NextResponse.json(
      { error: 'Failed to delete card' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { db, decks, cards } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth/middleware'
import { eq, and } from 'drizzle-orm'
import { deckRepository } from '@/lib/repositories/deck-repository'

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
    const deck = await db
      .select()
      .from(decks)
      .where(and(eq(decks.id, id), eq(decks.ownerUserId, user.id)))
      .get()

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
    }

    const deckCards = await db
      .select()
      .from(cards)
      .where(eq(cards.deckId, id))
      .all()

    return NextResponse.json({ deck, cards: deckCards })
  } catch (error) {
    console.error('Error fetching deck:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deck' },
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
    const { title, description, level, language, isPublic } = await request.json()

    const existingDeck = await db
      .select()
      .from(decks)
      .where(and(eq(decks.id, id), eq(decks.ownerUserId, user.id)))
      .get()

    if (!existingDeck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
    }

    const [updatedDeck] = await db
      .update(decks)
      .set({
        title,
        description,
        level,
        language,
        isPublic,
        updatedAt: new Date(),
      })
      .where(and(eq(decks.id, id), eq(decks.ownerUserId, user.id)))
      .returning()

    return NextResponse.json({ deck: updatedDeck })
  } catch (error) {
    console.error('Error updating deck:', error)
    return NextResponse.json(
      { error: 'Failed to update deck' },
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
    const existingDeck = await deckRepository.findByIdAndUserId(id, user.id)

    if (!existingDeck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
    }

    await deckRepository.delete(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting deck:', error)
    return NextResponse.json(
      { error: 'Failed to delete deck' },
      { status: 500 }
    )
  }
}
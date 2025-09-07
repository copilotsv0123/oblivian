import { NextRequest, NextResponse } from 'next/server'
import { db, decks } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth/middleware'
import { eq, and } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userDecks = await db
      .select()
      .from(decks)
      .where(eq(decks.ownerUserId, user.id))
      .all()

    return NextResponse.json({ decks: userDecks })
  } catch (error) {
    console.error('Error fetching decks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch decks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, description, level, language, isPublic } = await request.json()

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const [newDeck] = await db.insert(decks).values({
      ownerUserId: user.id,
      title,
      description: description || null,
      level: level || 'simple',
      language: language || 'en',
      isPublic: isPublic || false,
    }).returning()

    return NextResponse.json({ deck: newDeck })
  } catch (error) {
    console.error('Error creating deck:', error)
    return NextResponse.json(
      { error: 'Failed to create deck' },
      { status: 500 }
    )
  }
}
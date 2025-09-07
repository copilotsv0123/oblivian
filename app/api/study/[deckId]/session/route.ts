import { NextRequest, NextResponse } from 'next/server'
import { db, studySessions } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth/middleware'
import { eq, and } from 'drizzle-orm'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { deckId } = await params

    const [session] = await db.insert(studySessions).values({
      userId: user.id,
      deckId,
      startedAt: new Date(),
      secondsActive: 0,
    }).returning()

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Error creating study session:', error)
    return NextResponse.json(
      { error: 'Failed to create study session' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId, secondsActive } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    const [updatedSession] = await db
      .update(studySessions)
      .set({
        endedAt: new Date(),
        secondsActive: secondsActive || 0,
      })
      .where(
        and(
          eq(studySessions.id, sessionId),
          eq(studySessions.userId, user.id)
        )
      )
      .returning()

    return NextResponse.json({ session: updatedSession })
  } catch (error) {
    console.error('Error updating study session:', error)
    return NextResponse.json(
      { error: 'Failed to update study session' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { db, studySessions, deckScores } from '@/lib/db'
import { authenticateRequest } from '@/lib/auth/middleware'
import { scheduleReview, ReviewRating } from '@/lib/fsrs/scheduler'
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
    const { cardId, rating, sessionId } = await request.json()

    if (!cardId || !rating) {
      return NextResponse.json(
        { error: 'cardId and rating are required' },
        { status: 400 }
      )
    }

    const validRatings: ReviewRating[] = ['again', 'hard', 'good', 'easy']
    if (!validRatings.includes(rating)) {
      return NextResponse.json(
        { error: 'Invalid rating' },
        { status: 400 }
      )
    }

    const schedule = await scheduleReview(cardId, user.id, rating)

    if (sessionId) {
      // Get the session to calculate elapsed time
      const session = await db
        .select()
        .from(studySessions)
        .where(
          and(
            eq(studySessions.id, sessionId),
            eq(studySessions.userId, user.id)
          )
        )
        .get()

      if (session && session.startedAt) {
        const endTime = new Date()
        const secondsActive = Math.floor(
          (endTime.getTime() - session.startedAt.getTime()) / 1000
        )

        await db
          .update(studySessions)
          .set({
            endedAt: endTime,
            secondsActive,
          })
          .where(eq(studySessions.id, sessionId))
      }
    }

    const accuracyScore = rating === 'again' ? 0 : rating === 'hard' ? 0.6 : 1
    
    const existingScore = await db
      .select()
      .from(deckScores)
      .where(
        and(
          eq(deckScores.userId, user.id),
          eq(deckScores.deckId, deckId),
          eq(deckScores.window, 'd30')
        )
      )
      .get()

    if (existingScore) {
      const newAccuracy = (existingScore.accuracyPct * 0.9 + accuracyScore * 0.1)
      await db
        .update(deckScores)
        .set({
          accuracyPct: newAccuracy,
          stabilityAvg: schedule.stability,
          lapses: rating === 'again' ? existingScore.lapses + 1 : existingScore.lapses,
          updatedAt: new Date(),
        })
        .where(eq(deckScores.id, existingScore.id))
    } else {
      await db.insert(deckScores).values({
        userId: user.id,
        deckId,
        window: 'd30',
        accuracyPct: accuracyScore,
        stabilityAvg: schedule.stability,
        lapses: rating === 'again' ? 1 : 0,
      })
    }

    return NextResponse.json({
      success: true,
      nextDue: schedule.due,
      interval: schedule.scheduled_days,
    })
  } catch (error) {
    console.error('Error recording review:', error)
    return NextResponse.json(
      { error: 'Failed to record review' },
      { status: 500 }
    )
  }
}
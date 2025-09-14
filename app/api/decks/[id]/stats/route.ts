import { withApiHandler, ApiContext } from '@/lib/middleware/api-wrapper'
import { db } from '@/lib/db'
import { decks, reviews, studySessions, cards } from '@/lib/db'
import { eq, and, desc, sql } from 'drizzle-orm'

export const GET = withApiHandler(async ({ user }: ApiContext, routeContext: any) => {
  const { params } = routeContext as { params: Promise<{ id: string }> }
  const { id: deckId } = await params

  // Check if deck exists (allow any user to view any deck)
  const deck = await db
    .select()
    .from(decks)
    .where(eq(decks.id, deckId))
    .then(res => res[0] || null)

  if (!deck) {
    throw new Error('not found: Deck not found')
  }

  // Get last study session
  const lastSession = await db
    .select({
      startedAt: studySessions.startedAt,
      secondsActive: studySessions.secondsActive,
    })
    .from(studySessions)
    .where(and(
      eq(studySessions.userId, user.id),
      eq(studySessions.deckId, deckId)
    ))
    .orderBy(desc(studySessions.startedAt))
    .limit(1)
    .then(res => res[0] || null)

  // Get total number of study sessions
  const totalSessions = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(studySessions)
    .where(and(
      eq(studySessions.userId, user.id),
      eq(studySessions.deckId, deckId)
    ))
    .then(res => res[0]?.count || 0)

  // Get performance metrics (last 30 reviews)
  // Join reviews with cards to filter by deckId
  const recentReviews = await db
    .select({
      rating: reviews.rating,
    })
    .from(reviews)
    .innerJoin(cards, eq(reviews.cardId, cards.id))
    .where(and(
      eq(reviews.userId, user.id),
      eq(cards.deckId, deckId)
    ))
    .orderBy(desc(reviews.reviewedAt))
    .limit(30)

  // Calculate performance grade
  let performanceGrade = null
  let successRate = null

  if (recentReviews.length >= 10) { // Need at least 10 reviews for a grade
    const successCount = recentReviews.filter(r =>
      r.rating === 'good' || r.rating === 'easy'
    ).length

    successRate = successCount / recentReviews.length

    // Determine grade based on success rate
    if (successRate >= 0.95) performanceGrade = 'A+'
    else if (successRate >= 0.90) performanceGrade = 'A'
    else if (successRate >= 0.80) performanceGrade = 'B'
    else if (successRate >= 0.70) performanceGrade = 'C'
    else if (successRate >= 0.60) performanceGrade = 'D'
    else performanceGrade = 'F'
  }

  // Get total cards reviewed
  const totalCardsReviewed = await db
    .select({ count: sql<number>`count(distinct ${reviews.cardId})::int` })
    .from(reviews)
    .innerJoin(cards, eq(reviews.cardId, cards.id))
    .where(and(
      eq(reviews.userId, user.id),
      eq(cards.deckId, deckId)
    ))
    .then(res => res[0]?.count || 0)

  return {
    stats: {
      lastStudyDate: lastSession?.startedAt || null,
      totalSessions,
      totalCardsReviewed,
      performanceGrade,
      successRate: successRate ? Math.round(successRate * 100) : null,
      reviewCount: recentReviews.length,
    }
  }
})
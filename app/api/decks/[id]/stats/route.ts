import { withApiHandler, ApiContext } from '@/lib/middleware/api-wrapper'
import { db } from '@/lib/db'
import { decks, reviews, studySessions, cards } from '@/lib/db'
import { eq, and, desc, sql } from 'drizzle-orm'

export const GET = withApiHandler(async ({ user, request }: ApiContext, routeContext: any) => {
  const { params } = routeContext as { params: Promise<{ id: string }> }
  const { id: deckId } = await params

  // Check for sessionId query parameter
  const url = new URL(request.url)
  const sessionId = url.searchParams.get('sessionId')

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

  // Get performance metrics - either session-specific or historical
  let recentReviews

  if (sessionId) {
    // Session-specific performance
    recentReviews = await db
      .select({
        rating: reviews.rating,
      })
      .from(reviews)
      .innerJoin(cards, eq(reviews.cardId, cards.id))
      .where(and(
        eq(reviews.userId, user.id),
        eq(cards.deckId, deckId),
        eq(reviews.sessionId, sessionId)
      ))
      .orderBy(desc(reviews.reviewedAt))
  } else {
    // Historical performance (last 30 reviews)
    recentReviews = await db
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
  }

  // Calculate performance grade
  let performanceGrade = null
  let successRate = null

  const minReviewsForGrade = sessionId ? 1 : 10 // Session: any reviews, Historical: 10+ reviews
  if (recentReviews.length >= minReviewsForGrade) {
    // Calculate weighted success rate: full credit for good/easy, partial for hard
    let totalScore = 0
    recentReviews.forEach(r => {
      if (r.rating === 'easy') totalScore += 1.0      // 100% credit
      else if (r.rating === 'good') totalScore += 1.0 // 100% credit
      else if (r.rating === 'hard') totalScore += 0.7 // 70% credit - you remembered but struggled
      else if (r.rating === 'again') totalScore += 0  // 0% credit - complete failure
    })

    successRate = totalScore / recentReviews.length

    // Determine grade based on success rate (better distributed)
    if (successRate >= 0.95) performanceGrade = 'A+'      // 95-100% (5%)
    else if (successRate >= 0.90) performanceGrade = 'A'  // 90-94% (5%)
    else if (successRate >= 0.85) performanceGrade = 'A-' // 85-89% (5%)
    else if (successRate >= 0.80) performanceGrade = 'B+' // 80-84% (5%)
    else if (successRate >= 0.75) performanceGrade = 'B'  // 75-79% (5%)
    else if (successRate >= 0.70) performanceGrade = 'B-' // 70-74% (5%)
    else if (successRate >= 0.65) performanceGrade = 'C+' // 65-69% (5%)
    else if (successRate >= 0.60) performanceGrade = 'C'  // 60-64% (5%)
    else if (successRate >= 0.55) performanceGrade = 'C-' // 55-59% (5%)
    else if (successRate >= 0.50) performanceGrade = 'D+' // 50-54% (5%)
    else if (successRate >= 0.45) performanceGrade = 'D'  // 45-49% (5%)
    else if (successRate >= 0.40) performanceGrade = 'D-' // 40-44% (5%)
    else performanceGrade = 'F'                           // <40%
  }

  // Get total cards reviewed - either session-specific or historical
  let totalCardsReviewed
  if (sessionId) {
    totalCardsReviewed = await db
      .select({ count: sql<number>`count(distinct ${reviews.cardId})::int` })
      .from(reviews)
      .innerJoin(cards, eq(reviews.cardId, cards.id))
      .where(and(
        eq(reviews.userId, user.id),
        eq(cards.deckId, deckId),
        eq(reviews.sessionId, sessionId)
      ))
      .then(res => res[0]?.count || 0)
  } else {
    totalCardsReviewed = await db
      .select({ count: sql<number>`count(distinct ${reviews.cardId})::int` })
      .from(reviews)
      .innerJoin(cards, eq(reviews.cardId, cards.id))
      .where(and(
        eq(reviews.userId, user.id),
        eq(cards.deckId, deckId)
      ))
      .then(res => res[0]?.count || 0)
  }

  return {
    stats: {
      lastStudyDate: lastSession?.startedAt || null,
      totalSessions,
      totalCardsReviewed,
      performanceGrade,
      successRate: successRate ? Math.round(successRate * 100) : null,
      reviewCount: recentReviews.length,
      isSessionSpecific: !!sessionId,
      sessionId: sessionId || null,
    }
  }
})
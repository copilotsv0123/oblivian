import { withApiHandler, ApiContext } from '@/lib/middleware/api-wrapper'
import { db } from '@/lib/db'
import { reviews, studySessions, cards } from '@/lib/db'
import { eq, and, sql } from 'drizzle-orm'

export const GET = withApiHandler(async ({ user }: ApiContext, routeContext: any) => {
  const { params } = routeContext as { params: Promise<{ id: string }> }
  const { id: sessionId } = await params

  // Verify session belongs to user
  const session = await db
    .select()
    .from(studySessions)
    .where(and(
      eq(studySessions.id, sessionId),
      eq(studySessions.userId, user.id)
    ))
    .then(res => res[0] || null)

  if (!session) {
    throw new Error('not found: Study session not found')
  }

  // Get session performance (reviews from this session)
  const sessionReviews = await db
    .select({
      rating: reviews.rating,
    })
    .from(reviews)
    .where(and(
      eq(reviews.userId, user.id),
      eq(reviews.sessionId, sessionId)
    ))

  // Calculate session performance grade
  let sessionGrade = null
  let sessionSuccessRate = null
  let totalSessionReviews = sessionReviews.length

  if (totalSessionReviews > 0) {
    // Calculate weighted success rate for session
    let totalScore = 0
    sessionReviews.forEach(r => {
      if (r.rating === 'easy') totalScore += 1.0      // 100% credit
      else if (r.rating === 'good') totalScore += 1.0 // 100% credit
      else if (r.rating === 'hard') totalScore += 0.7 // 70% credit - you remembered but struggled
      else if (r.rating === 'again') totalScore += 0  // 0% credit - complete failure
    })

    sessionSuccessRate = totalScore / totalSessionReviews

    // Determine grade based on success rate (same scale as deck stats)
    if (sessionSuccessRate >= 0.95) sessionGrade = 'A+'      // 95-100% (5%)
    else if (sessionSuccessRate >= 0.90) sessionGrade = 'A'  // 90-94% (5%)
    else if (sessionSuccessRate >= 0.85) sessionGrade = 'A-' // 85-89% (5%)
    else if (sessionSuccessRate >= 0.80) sessionGrade = 'B+' // 80-84% (5%)
    else if (sessionSuccessRate >= 0.75) sessionGrade = 'B'  // 75-79% (5%)
    else if (sessionSuccessRate >= 0.70) sessionGrade = 'B-' // 70-74% (5%)
    else if (sessionSuccessRate >= 0.65) sessionGrade = 'C+' // 65-69% (5%)
    else if (sessionSuccessRate >= 0.60) sessionGrade = 'C'  // 60-64% (5%)
    else if (sessionSuccessRate >= 0.55) sessionGrade = 'C-' // 55-59% (5%)
    else if (sessionSuccessRate >= 0.50) sessionGrade = 'D+' // 50-54% (5%)
    else if (sessionSuccessRate >= 0.45) sessionGrade = 'D'  // 45-49% (5%)
    else if (sessionSuccessRate >= 0.40) sessionGrade = 'D-' // 40-44% (5%)
    else sessionGrade = 'F'                                  // <40%
  }

  // Get total unique cards reviewed in this session
  const sessionCardsReviewed = await db
    .select({ count: sql<number>`count(distinct ${reviews.cardId})::int` })
    .from(reviews)
    .where(and(
      eq(reviews.userId, user.id),
      eq(reviews.sessionId, sessionId)
    ))
    .then(res => res[0]?.count || 0)

  return {
    sessionPerformance: {
      sessionId,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      secondsActive: session.secondsActive,
      totalReviews: totalSessionReviews,
      cardsReviewed: sessionCardsReviewed,
      performanceGrade: sessionGrade,
      successRate: sessionSuccessRate ? Math.round(sessionSuccessRate * 100) : null,
    }
  }
})
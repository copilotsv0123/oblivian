import { db, deckScores, reviews, cards } from '@/lib/db'
import { eq, and, sql, gte } from 'drizzle-orm'

interface ScoreWindow {
  window: 'd7' | 'd30' | 'd90'
  days: number
}

const SCORE_WINDOWS: ScoreWindow[] = [
  { window: 'd7', days: 7 },
  { window: 'd30', days: 30 },
  { window: 'd90', days: 90 },
]

/**
 * Calculate and update deck scores for a user's deck
 * Based on review accuracy within different time windows
 */
export async function updateDeckScores(userId: string, deckId: string) {
  try {
    for (const { window, days } of SCORE_WINDOWS) {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Calculate accuracy for the time window
      const stats = await db
        .select({
          totalReviews: sql<number>`COUNT(*)`,
          correctReviews: sql<number>`SUM(CASE 
            WHEN reviews.rating IN ('good', 'easy') THEN 1 
            ELSE 0 
          END)`,
          avgStability: sql<number>`AVG(reviews.stability)`,
          lapsesCount: sql<number>`SUM(CASE 
            WHEN reviews.rating = 'again' THEN 1 
            ELSE 0 
          END)`,
        })
        .from(reviews)
        .innerJoin(cards, eq(reviews.cardId, cards.id))
        .where(
          and(
            eq(reviews.userId, userId),
            eq(cards.deckId, deckId),
            gte(reviews.reviewedAt, startDate)
          )
        )
        .get()

      if (!stats || stats.totalReviews === 0) {
        continue
      }

      const accuracyPct = (stats.correctReviews / stats.totalReviews) * 100
      const stabilityAvg = stats.avgStability || 0
      const lapses = stats.lapsesCount || 0

      // Upsert deck score
      await db
        .insert(deckScores)
        .values({
          userId,
          deckId,
          window,
          accuracyPct,
          stabilityAvg,
          lapses,
        })
        .onConflictDoUpdate({
          target: [deckScores.userId, deckScores.deckId, deckScores.window],
          set: {
            accuracyPct,
            stabilityAvg,
            lapses,
            updatedAt: new Date(),
          },
        })
    }
  } catch (error) {
    console.error('Error updating deck scores:', error)
  }
}

/**
 * Get deck scores for display
 */
export async function getDeckScores(userId: string, deckId: string) {
  const scores = await db
    .select()
    .from(deckScores)
    .where(
      and(
        eq(deckScores.userId, userId),
        eq(deckScores.deckId, deckId)
      )
    )
    .all()

  // Convert to display format
  const scoreMap: Record<string, string> = {}
  
  for (const score of scores) {
    const level = getScoreLevel(score.accuracyPct)
    scoreMap[score.window] = level
  }

  return scoreMap
}

/**
 * Convert accuracy percentage to display level
 */
function getScoreLevel(accuracyPct: number): string {
  if (accuracyPct >= 80) return 'High'
  if (accuracyPct >= 60) return 'Medium'
  return 'Low'
}

/**
 * Check if daily load is too high and return warning
 */
export async function checkDailyLoadWarning(userId: string, deckId: string): Promise<string | null> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Count reviews done today
  const todayReviews = await db
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(reviews)
    .innerJoin(cards, eq(reviews.cardId, cards.id))
    .where(
      and(
        eq(reviews.userId, userId),
        eq(cards.deckId, deckId),
        gte(reviews.reviewedAt, today)
      )
    )
    .get()

  const reviewCount = todayReviews?.count || 0

  // Check average daily load over past 7 days
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  
  const weekStats = await db
    .select({
      avgDaily: sql<number>`COUNT(*) / 7.0`,
    })
    .from(reviews)
    .innerJoin(cards, eq(reviews.cardId, cards.id))
    .where(
      and(
        eq(reviews.userId, userId),
        eq(cards.deckId, deckId),
        gte(reviews.reviewedAt, weekAgo)
      )
    )
    .get()

  const avgDaily = weekStats?.avgDaily || 0

  // Show warning if today's load is significantly higher than average
  if (reviewCount > 50 && reviewCount > avgDaily * 1.5) {
    return `You have ${reviewCount} cards to review today, which is higher than your usual average of ${Math.round(avgDaily)}. Consider spreading them out or taking breaks.`
  }

  // Show warning for absolute high numbers
  if (reviewCount > 100) {
    return `You have ${reviewCount} cards to review today. Consider taking regular breaks to maintain focus.`
  }

  return null
}
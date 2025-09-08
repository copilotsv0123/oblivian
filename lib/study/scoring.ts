import { deckScoreRepository } from '@/lib/repositories/deck-score-repository'

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
      // Calculate accuracy for the time window
      const stats = await deckScoreRepository.getReviewStatsForTimeWindow(userId, deckId, days)

      if (stats.totalReviews === 0) {
        continue
      }

      const accuracyPct = (stats.correctReviews / stats.totalReviews) * 100
      const stabilityAvg = stats.avgStability || 0
      const lapses = stats.lapsesCount || 0

      // Upsert deck score
      await deckScoreRepository.upsertDeckScore({
        userId,
        deckId,
        window,
        accuracyPct,
        stabilityAvg,
        lapses,
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
  return await deckScoreRepository.findByUserAndDeck(userId, deckId)
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
  // Count reviews done today
  const reviewCount = await deckScoreRepository.getDailyReviewCount(userId, deckId)

  // Check average daily load over past 7 days
  const avgDaily = await deckScoreRepository.getWeeklyAverageReviews(userId, deckId)

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
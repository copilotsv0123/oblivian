import { rankingRepository } from '@/lib/repositories'

interface RankingWindow {
  window: 'd7' | 'd30'
  days: number
}

const RANKING_WINDOWS: RankingWindow[] = [
  { window: 'd7', days: 7 },
  { window: 'd30', days: 30 },
]

/**
 * Update rankings for all public decks
 * Should be run periodically (e.g., hourly)
 */
export async function updateDeckRankings() {
  for (const { window, days } of RANKING_WINDOWS) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // Get public decks with their stats
    const deckStats = await rankingRepository.getPublicDeckStats(startDate)
    
    // Calculate scores and prepare rankings
    const rankings = deckStats.map(stat => ({
      deckId: stat.deckId,
      window,
      cardsReviewed: stat.cardsReviewed,
      hoursStudied: stat.hoursStudied,
      uniqueUsers: stat.uniqueUsers,
      // Score: 70% cards reviewed + 30% hours studied (normalized)
      score: (stat.cardsReviewed * 0.7) + (stat.hoursStudied * 10 * 0.3),
    }))
    
    // Sort by score
    rankings.sort((a, b) => b.score - a.score)
    
    // Update or insert rankings with rank positions
    for (let i = 0; i < rankings.length; i++) {
      const ranking = rankings[i]
      const rank = i + 1
      
      const existing = await rankingRepository.findRanking(ranking.deckId, ranking.window)
      
      if (existing) {
        await rankingRepository.updateRanking(existing.id, {
          cardsReviewed: ranking.cardsReviewed,
          hoursStudied: ranking.hoursStudied,
          uniqueUsers: ranking.uniqueUsers,
          score: ranking.score,
          rank,
        })
      } else {
        await rankingRepository.createRanking({
          ...ranking,
          rank,
        })
      }
    }
  }
}

/**
 * Get top ranked decks for a time window
 */
export async function getTopRankedDecks(window: 'd7' | 'd30' = 'd7', limit = 10) {
  return await rankingRepository.getTopRankedDecks(window, limit)
}

/**
 * Get a deck's ranking info
 */
export async function getDeckRanking(deckId: string) {
  return await rankingRepository.getDeckRankings(deckId)
}

/**
 * Track deck usage for rankings
 * Called after each study session
 */
export async function trackDeckUsage(deckId: string, userId: string, sessionId: string) {
  // This is already handled by study sessions
  // Just ensure the deck is public to be included in rankings
  const isPublic = await rankingRepository.isDeckPublic(deckId)
  
  if (isPublic) {
    // Rankings will be updated in the next batch run
    return true
  }
  
  return false
}
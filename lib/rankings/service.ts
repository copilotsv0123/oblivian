import { db, deckRankings, decks, reviews, studySessions, cards } from '@/lib/db'
import { eq, sql, and, gte, desc, asc } from 'drizzle-orm'

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
    const deckStats = await db
      .select({
        deckId: decks.id,
        title: decks.title,
        cardsReviewed: sql<number>`
          COALESCE((
            SELECT COUNT(DISTINCT r.id)
            FROM reviews r
            INNER JOIN cards c ON r.card_id = c.id
            WHERE c.deck_id = decks.id
            AND r.reviewed_at >= ${startDate}
          ), 0)
        `,
        hoursStudied: sql<number>`
          COALESCE((
            SELECT SUM(seconds_active / 3600.0)
            FROM study_sessions
            WHERE deck_id = decks.id
            AND started_at >= ${startDate}
          ), 0)
        `,
        uniqueUsers: sql<number>`
          COALESCE((
            SELECT COUNT(DISTINCT user_id)
            FROM study_sessions
            WHERE deck_id = decks.id
            AND started_at >= ${startDate}
          ), 0)
        `,
      })
      .from(decks)
      .where(eq(decks.isPublic, true))
      .all()
    
    // Calculate scores and prepare rankings
    const rankings = deckStats.map(stat => ({
      deckId: stat.deckId,
      window,
      cardsReviewed: stat.cardsReviewed || 0,
      hoursStudied: stat.hoursStudied || 0,
      uniqueUsers: stat.uniqueUsers || 0,
      // Score: 70% cards reviewed + 30% hours studied (normalized)
      score: (stat.cardsReviewed * 0.7) + (stat.hoursStudied * 10 * 0.3),
    }))
    
    // Sort by score
    rankings.sort((a, b) => b.score - a.score)
    
    // Update or insert rankings with rank positions
    for (let i = 0; i < rankings.length; i++) {
      const ranking = rankings[i]
      const rank = i + 1
      
      const existing = await db
        .select()
        .from(deckRankings)
        .where(
          and(
            eq(deckRankings.deckId, ranking.deckId),
            eq(deckRankings.window, ranking.window)
          )
        )
        .get()
      
      if (existing) {
        await db
          .update(deckRankings)
          .set({
            cardsReviewed: ranking.cardsReviewed,
            hoursStudied: ranking.hoursStudied,
            uniqueUsers: ranking.uniqueUsers,
            score: ranking.score,
            rank,
            updatedAt: new Date(),
          })
          .where(eq(deckRankings.id, existing.id))
      } else {
        await db
          .insert(deckRankings)
          .values({
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
  const rankings = await db
    .select({
      rank: deckRankings.rank,
      score: deckRankings.score,
      cardsReviewed: deckRankings.cardsReviewed,
      hoursStudied: deckRankings.hoursStudied,
      uniqueUsers: deckRankings.uniqueUsers,
      deck: decks,
    })
    .from(deckRankings)
    .innerJoin(decks, eq(deckRankings.deckId, decks.id))
    .where(eq(deckRankings.window, window))
    .orderBy(asc(deckRankings.rank))
    .limit(limit)
    .all()
  
  return rankings.map(r => ({
    ...r.deck,
    rank: r.rank,
    score: r.score,
    stats: {
      cardsReviewed: r.cardsReviewed,
      hoursStudied: Math.round(r.hoursStudied * 10) / 10,
      uniqueUsers: r.uniqueUsers,
    },
  }))
}

/**
 * Get a deck's ranking info
 */
export async function getDeckRanking(deckId: string) {
  const rankings = await db
    .select()
    .from(deckRankings)
    .where(eq(deckRankings.deckId, deckId))
    .all()
  
  const result: Record<string, any> = {}
  
  for (const ranking of rankings) {
    result[ranking.window] = {
      rank: ranking.rank,
      score: ranking.score,
      cardsReviewed: ranking.cardsReviewed,
      hoursStudied: Math.round(ranking.hoursStudied * 10) / 10,
      uniqueUsers: ranking.uniqueUsers,
    }
  }
  
  return result
}

/**
 * Track deck usage for rankings
 * Called after each study session
 */
export async function trackDeckUsage(deckId: string, userId: string, sessionId: string) {
  // This is already handled by study sessions
  // Just ensure the deck is public to be included in rankings
  const deck = await db
    .select()
    .from(decks)
    .where(eq(decks.id, deckId))
    .get()
  
  if (deck?.isPublic) {
    // Rankings will be updated in the next batch run
    return true
  }
  
  return false
}
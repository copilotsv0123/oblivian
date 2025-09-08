import { db, deckRankings, decks, reviews, studySessions, cards } from '@/lib/db'
import { eq, sql, and, gte, desc, asc } from 'drizzle-orm'
import { BaseRepository } from './base-repository'

export interface RankingStats {
  deckId: string
  title: string
  cardsReviewed: number
  hoursStudied: number
  uniqueUsers: number
}

export interface RankingData {
  deckId: string
  window: 'd7' | 'd30'
  cardsReviewed: number
  hoursStudied: number
  uniqueUsers: number
  score: number
  rank: number
}

export class RankingRepository extends BaseRepository {
  /**
   * Get public deck stats for ranking calculations
   */
  async getPublicDeckStats(startDate: Date): Promise<RankingStats[]> {
    try {
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
      
      return deckStats.map(stat => ({
        deckId: stat.deckId,
        title: stat.title,
        cardsReviewed: stat.cardsReviewed || 0,
        hoursStudied: stat.hoursStudied || 0,
        uniqueUsers: stat.uniqueUsers || 0,
      }))
    } catch (error) {
      throw this.handleError(error, 'getPublicDeckStats')
    }
  }

  /**
   * Find existing ranking for a deck and window
   */
  async findRanking(deckId: string, window: 'd7' | 'd30') {
    try {
      this.validateRequiredFields({ deckId, window }, ['deckId', 'window'])
      
      return await db
        .select()
        .from(deckRankings)
        .where(
          and(
            eq(deckRankings.deckId, deckId),
            eq(deckRankings.window, window)
          )
        )
        .get()
    } catch (error) {
      throw this.handleError(error, 'findRanking')
    }
  }

  /**
   * Update an existing ranking
   */
  async updateRanking(
    id: string,
    data: {
      cardsReviewed: number
      hoursStudied: number
      uniqueUsers: number
      score: number
      rank: number
    }
  ) {
    try {
      this.validateRequiredFields({ id }, ['id'])
      
      await db
        .update(deckRankings)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(deckRankings.id, id))
    } catch (error) {
      throw this.handleError(error, 'updateRanking')
    }
  }

  /**
   * Create a new ranking
   */
  async createRanking(data: {
    deckId: string
    window: 'd7' | 'd30'
    cardsReviewed: number
    hoursStudied: number
    uniqueUsers: number
    score: number
    rank: number
  }) {
    try {
      this.validateRequiredFields(data, ['deckId', 'window', 'rank'])
      
      await db
        .insert(deckRankings)
        .values(data)
    } catch (error) {
      throw this.handleError(error, 'createRanking')
    }
  }

  /**
   * Get top ranked decks for a time window
   */
  async getTopRankedDecks(window: 'd7' | 'd30' = 'd7', limit = 10) {
    try {
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
    } catch (error) {
      throw this.handleError(error, 'getTopRankedDecks')
    }
  }

  /**
   * Get all rankings for a specific deck
   */
  async getDeckRankings(deckId: string) {
    try {
      this.validateRequiredFields({ deckId }, ['deckId'])
      
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
    } catch (error) {
      throw this.handleError(error, 'getDeckRankings')
    }
  }

  /**
   * Check if a deck is public (for tracking eligibility)
   */
  async isDeckPublic(deckId: string): Promise<boolean> {
    try {
      this.validateRequiredFields({ deckId }, ['deckId'])
      
      const deck = await db
        .select()
        .from(decks)
        .where(eq(decks.id, deckId))
        .get()
      
      return deck?.isPublic || false
    } catch (error) {
      throw this.handleError(error, 'isDeckPublic')
    }
  }
}

export const rankingRepository = new RankingRepository()
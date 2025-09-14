import { db } from '@/lib/db'
import { deckScores, reviews, cards } from '@/lib/db'
import type { DeckScore, NewDeckScore } from '@/lib/db'
import { eq, and, sql, gte } from 'drizzle-orm'
import { BaseRepository, CreateResult } from './base-repository'

export interface DeckScoreStats {
  totalReviews: number
  correctReviews: number
  avgStability: number
  lapsesCount: number
}

export interface UpsertDeckScoreInput {
  userId: string
  deckId: string
  window: 'd7' | 'd30' | 'd90'
  accuracyPct: number
  stabilityAvg: number
  lapses: number
}

export class DeckScoreRepository extends BaseRepository {
  async findByUserAndDeck(userId: string, deckId: string): Promise<Record<string, any>> {
    try {
      this.validateRequiredFields({ userId, deckId }, ['userId', 'deckId'])
      
      const scores = await db
        .select()
        .from(deckScores)
        .where(
          and(
            eq(deckScores.userId, userId),
            eq(deckScores.deckId, deckId)
          )
        )
        

      // Convert to display format
      const scoreMap: Record<string, string> = {}
      
      for (const score of scores) {
        const level = this.getScoreLevel(score.accuracyPct)
        scoreMap[score.window] = level
      }

      return scoreMap
    } catch (error) {
      this.handleError(error, 'findByUserAndDeck')
    }
  }

  async getReviewStatsForTimeWindow(
    userId: string, 
    deckId: string, 
    days: number
  ): Promise<DeckScoreStats> {
    try {
      this.validateRequiredFields({ userId, deckId }, ['userId', 'deckId'])
      
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

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
        .then(res => res[0] || null)

      return {
        totalReviews: stats?.totalReviews || 0,
        correctReviews: stats?.correctReviews || 0,
        avgStability: stats?.avgStability || 0,
        lapsesCount: stats?.lapsesCount || 0,
      }
    } catch (error) {
      this.handleError(error, 'getReviewStatsForTimeWindow')
    }
  }

  async upsertDeckScore(input: UpsertDeckScoreInput): Promise<void> {
    try {
      this.validateRequiredFields(input, ['userId', 'deckId', 'window', 'accuracyPct', 'stabilityAvg'])
      
      await db
        .insert(deckScores)
        .values({
          userId: input.userId,
          deckId: input.deckId,
          window: input.window,
          accuracyPct: input.accuracyPct,
          stabilityAvg: input.stabilityAvg,
          lapses: input.lapses,
        })
        .onConflictDoUpdate({
          target: [deckScores.userId, deckScores.deckId, deckScores.window],
          set: {
            accuracyPct: input.accuracyPct,
            stabilityAvg: input.stabilityAvg,
            lapses: input.lapses,
            updatedAt: new Date(),
          },
        })
    } catch (error) {
      this.handleError(error, 'upsertDeckScore')
    }
  }

  async updateDeckScoreAfterReview(
    userId: string, 
    deckId: string, 
    rating: 'again' | 'hard' | 'good' | 'easy', 
    stability: number
  ): Promise<void> {
    try {
      this.validateRequiredFields({ userId, deckId, rating }, ['userId', 'deckId', 'rating'])
      
      const accuracyScore = rating === 'again' ? 0 : rating === 'hard' ? 0.6 : 1
      
      const existingScore = await db
        .select()
        .from(deckScores)
        .where(
          and(
            eq(deckScores.userId, userId),
            eq(deckScores.deckId, deckId),
            eq(deckScores.window, 'd30')
          )
        )
        .then(res => res[0] || null)

      if (existingScore) {
        const newAccuracy = (existingScore.accuracyPct * 0.9 + accuracyScore * 0.1)
        await db
          .update(deckScores)
          .set({
            accuracyPct: newAccuracy,
            stabilityAvg: stability,
            lapses: rating === 'again' ? existingScore.lapses + 1 : existingScore.lapses,
            updatedAt: new Date(),
          })
          .where(eq(deckScores.id, existingScore.id))
      } else {
        await db.insert(deckScores).values({
          userId,
          deckId,
          window: 'd30',
          accuracyPct: accuracyScore,
          stabilityAvg: stability,
          lapses: rating === 'again' ? 1 : 0,
        })
      }
    } catch (error) {
      this.handleError(error, 'updateDeckScoreAfterReview')
    }
  }

  async getDailyReviewCount(userId: string, deckId: string): Promise<number> {
    try {
      this.validateRequiredFields({ userId, deckId }, ['userId', 'deckId'])
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
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
        .then(res => res[0] || null)

      return todayReviews?.count || 0
    } catch (error) {
      this.handleError(error, 'getDailyReviewCount')
    }
  }

  async getWeeklyAverageReviews(userId: string, deckId: string): Promise<number> {
    try {
      this.validateRequiredFields({ userId, deckId }, ['userId', 'deckId'])
      
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
        .then(res => res[0] || null)

      return weekStats?.avgDaily || 0
    } catch (error) {
      this.handleError(error, 'getWeeklyAverageReviews')
    }
  }

  private getScoreLevel(accuracyPct: number): string {
    if (accuracyPct >= 80) return 'High'
    if (accuracyPct >= 60) return 'Medium'
    return 'Low'
  }
}

export const deckScoreRepository = new DeckScoreRepository()
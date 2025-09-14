import { db } from '@/lib/db'
import { reviews, type Review, type NewReview } from '@/lib/db'
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm'
import { BaseRepository, CreateResult, PaginatedResult } from './base-repository'

export interface CreateReviewInput {
  userId: string
  cardId: string
  rating: 'again' | 'hard' | 'good' | 'easy'
  scheduledAt: Date
  intervalDays: number
  stability: number
  difficulty: number
  state?: any
}

export interface ReviewFilters {
  userId?: string
  cardId?: string
  deckId?: string
  rating?: 'again' | 'hard' | 'good' | 'easy'
  dateFrom?: Date
  dateTo?: Date
}

export interface ReviewStats {
  totalReviews: number
  averageRating: number
  accuracyRate: number
  reviewsByRating: Record<string, number>
}

export class ReviewRepository extends BaseRepository {
  async findById(reviewId: string): Promise<Review | null> {
    try {
      const review = await db
        .select()
        .from(reviews)
        .where(eq(reviews.id, reviewId))
        .then(res => res[0] || null)
      
      return review || null
    } catch (error) {
      this.handleError(error, 'findById')
    }
  }

  async findByCardId(cardId: string, limit = 50, offset = 0): Promise<Review[]> {
    try {
      this.validateRequiredFields({ cardId }, ['cardId'])
      
      const cardReviews = await db
        .select()
        .from(reviews)
        .where(eq(reviews.cardId, cardId))
        .orderBy(desc(reviews.reviewedAt))
        .limit(limit)
        .offset(offset)
        
      
      return cardReviews
    } catch (error) {
      this.handleError(error, 'findByCardId')
    }
  }

  async findByUserId(userId: string, limit = 100, offset = 0): Promise<Review[]> {
    try {
      this.validateRequiredFields({ userId }, ['userId'])
      
      const userReviews = await db
        .select()
        .from(reviews)
        .where(eq(reviews.userId, userId))
        .orderBy(desc(reviews.reviewedAt))
        .limit(limit)
        .offset(offset)
        
      
      return userReviews
    } catch (error) {
      this.handleError(error, 'findByUserId')
    }
  }

  async findByUserAndCard(userId: string, cardId: string): Promise<Review[]> {
    try {
      this.validateRequiredFields({ userId, cardId }, ['userId', 'cardId'])
      
      const userCardReviews = await db
        .select()
        .from(reviews)
        .where(and(
          eq(reviews.userId, userId),
          eq(reviews.cardId, cardId)
        ))
        .orderBy(desc(reviews.reviewedAt))
        
      
      return userCardReviews
    } catch (error) {
      this.handleError(error, 'findByUserAndCard')
    }
  }

  async findDue(userId: string, limit = 50): Promise<Review[]> {
    try {
      this.validateRequiredFields({ userId }, ['userId'])
      
      const now = new Date()
      const dueReviews = await db
        .select()
        .from(reviews)
        .where(and(
          eq(reviews.userId, userId),
          lte(reviews.scheduledAt, now)
        ))
        .orderBy(reviews.scheduledAt)
        .limit(limit)
        
      
      return dueReviews
    } catch (error) {
      this.handleError(error, 'findDue')
    }
  }

  async findRecentByUserId(userId: string, days = 7): Promise<Review[]> {
    try {
      this.validateRequiredFields({ userId }, ['userId'])
      
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      
      const recentReviews = await db
        .select()
        .from(reviews)
        .where(and(
          eq(reviews.userId, userId),
          gte(reviews.reviewedAt, cutoffDate)
        ))
        .orderBy(desc(reviews.reviewedAt))
        
      
      return recentReviews
    } catch (error) {
      this.handleError(error, 'findRecentByUserId')
    }
  }

  async create(input: CreateReviewInput): Promise<CreateResult<Review>> {
    try {
      this.validateRequiredFields(input, [
        'userId', 'cardId', 'rating', 'scheduledAt', 
        'intervalDays', 'stability', 'difficulty'
      ])
      
      const [newReview] = await db
        .insert(reviews)
        .values({
          userId: input.userId,
          cardId: input.cardId,
          rating: input.rating,
          scheduledAt: input.scheduledAt,
          intervalDays: input.intervalDays,
          stability: input.stability,
          difficulty: input.difficulty,
          state: input.state ? JSON.stringify(input.state) : null,
        })
        .returning()

      return {
        success: true,
        data: newReview,
        id: newReview.id,
      }
    } catch (error) {
      this.handleError(error, 'create')
    }
  }

  async getReviewStats(userId: string, cardId?: string): Promise<ReviewStats> {
    try {
      this.validateRequiredFields({ userId }, ['userId'])
      
      const whereCondition = cardId 
        ? and(eq(reviews.userId, userId), eq(reviews.cardId, cardId))
        : eq(reviews.userId, userId)

      // Get basic stats
      const statsQuery = await db
        .select({
          totalReviews: sql<number>`COUNT(*)`,
          averageRating: sql<number>`AVG(CASE 
            WHEN rating = 'again' THEN 1
            WHEN rating = 'hard' THEN 2
            WHEN rating = 'good' THEN 3
            WHEN rating = 'easy' THEN 4
            ELSE 0
          END)`,
        })
        .from(reviews)
        .where(whereCondition)
        .then(res => res[0] || null)

      // Get rating distribution
      const ratingDistribution = await db
        .select({
          rating: reviews.rating,
          count: sql<number>`COUNT(*)`
        })
        .from(reviews)
        .where(whereCondition)
        .groupBy(reviews.rating)
        

      const reviewsByRating: Record<string, number> = {}
      ratingDistribution.forEach(row => {
        reviewsByRating[row.rating] = row.count
      })

      // Calculate accuracy rate (good + easy reviews / total reviews)
      const goodCount = reviewsByRating['good'] || 0
      const easyCount = reviewsByRating['easy'] || 0
      const totalCount = statsQuery?.totalReviews || 0
      const accuracyRate = totalCount > 0 ? (goodCount + easyCount) / totalCount : 0

      return {
        totalReviews: totalCount,
        averageRating: statsQuery?.averageRating || 0,
        accuracyRate,
        reviewsByRating,
      }
    } catch (error) {
      this.handleError(error, 'getReviewStats')
    }
  }

  async getStreakData(userId: string): Promise<{
    currentStreak: number
    longestStreak: number
    reviewDates: string[]
  }> {
    try {
      this.validateRequiredFields({ userId }, ['userId'])
      
      // Get unique review dates for the last 365 days
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      
      const reviewDates = await db
        .select({
          reviewDate: sql<string>`DATE(reviewed_at)`
        })
        .from(reviews)
        .where(and(
          eq(reviews.userId, userId),
          gte(reviews.reviewedAt, oneYearAgo)
        ))
        .groupBy(sql`DATE(reviewed_at)`)
        .orderBy(sql`DATE(reviewed_at)`)
        

      const dates = reviewDates.map(row => row.reviewDate)
      
      // Calculate streaks
      let currentStreak = 0
      let longestStreak = 0
      let tempStreak = 0

      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      // Check if user reviewed today or yesterday to maintain streak
      const hasRecentReview = dates.includes(today) || dates.includes(yesterdayStr)
      
      if (hasRecentReview) {
        // Calculate current streak working backwards from today
        let checkDate = new Date()
        while (true) {
          const dateStr = checkDate.toISOString().split('T')[0]
          if (dates.includes(dateStr)) {
            currentStreak++
            checkDate.setDate(checkDate.getDate() - 1)
          } else {
            break
          }
        }
      }

      // Calculate longest streak
      for (let i = 0; i < dates.length; i++) {
        tempStreak = 1
        for (let j = i + 1; j < dates.length; j++) {
          const currentDate = new Date(dates[j])
          const prevDate = new Date(dates[j - 1])
          const dayDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
          
          if (dayDiff === 1) {
            tempStreak++
          } else {
            break
          }
        }
        longestStreak = Math.max(longestStreak, tempStreak)
      }

      return {
        currentStreak,
        longestStreak,
        reviewDates: dates,
      }
    } catch (error) {
      this.handleError(error, 'getStreakData')
    }
  }

  async deleteByCardId(cardId: string): Promise<{ success: boolean; deletedCount: number }> {
    try {
      this.validateRequiredFields({ cardId }, ['cardId'])

      const reviewsToDelete = await this.findByCardId(cardId)
      await db.delete(reviews).where(eq(reviews.cardId, cardId))

      return {
        success: true,
        deletedCount: reviewsToDelete.length,
      }
    } catch (error) {
      this.handleError(error, 'deleteByCardId')
    }
  }
}

export const reviewRepository = new ReviewRepository()
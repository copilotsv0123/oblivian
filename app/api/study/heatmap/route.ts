import { withApiHandler, ApiContext } from '@/lib/middleware/api-wrapper'
import { db } from '@/lib/db'
import { studySessions, reviews } from '@/lib/db'
import { eq, and, gte, sql } from 'drizzle-orm'

export const GET = withApiHandler(async ({ user }: ApiContext) => {
  // Get study sessions for the last 365 days
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  // Get sessions count by date
  const sessionData = await db
    .select({
      date: sql<string>`DATE(${studySessions.startedAt})`,
      count: sql<number>`count(*)::int`,
    })
    .from(studySessions)
    .where(and(
      eq(studySessions.userId, user.id),
      gte(studySessions.startedAt, oneYearAgo)
    ))
    .groupBy(sql`DATE(${studySessions.startedAt})`)

  // Get reviews count by date to estimate cards studied
  const reviewData = await db
    .select({
      date: sql<string>`DATE(${reviews.reviewedAt})`,
      totalCards: sql<number>`count(distinct ${reviews.cardId})::int`,
    })
    .from(reviews)
    .where(and(
      eq(reviews.userId, user.id),
      gte(reviews.reviewedAt, oneYearAgo)
    ))
    .groupBy(sql`DATE(${reviews.reviewedAt})`)

  // Combine the data
  const sessions = sessionData.map(session => {
    const review = reviewData.find(r => r.date === session.date)
    return {
      date: session.date,
      count: session.count,
      totalCards: review?.totalCards || 0,
    }
  })

  // Convert to a map for easy access
  const dataMap: Record<string, { count: number; totalCards: number }> = {}
  sessions.forEach(session => {
    dataMap[session.date] = {
      count: session.count,
      totalCards: session.totalCards || 0,
    }
  })

  return { heatmapData: dataMap }
})
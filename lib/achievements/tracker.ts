import { db } from '@/lib/db'
import { userAchievements, userStats, studySessions, reviews, cards, decks, deckScores } from '@/lib/db'
import { eq, and, sql, gte, lte } from 'drizzle-orm'
import { ACHIEVEMENTS } from './definitions'

export class AchievementTracker {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  // Initialize user stats if they don't exist
  async initializeUserStats() {
    const existing = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, this.userId))
      .then(res => res[0])

    if (!existing) {
      await db.insert(userStats).values({
        userId: this.userId,
      })
    }
  }

  // Update stats after a study session
  async updateAfterSession(sessionId: string, perfectSession: boolean) {
    await this.initializeUserStats()

    // Get session details
    const session = await db
      .select()
      .from(studySessions)
      .where(eq(studySessions.id, sessionId))
      .then(res => res[0])

    if (!session) return

    const hour = new Date(session.startedAt).getHours()
    const dayOfWeek = new Date(session.startedAt).getDay()
    const isNight = hour >= 0 && hour < 4
    const isEarly = hour >= 5 && hour < 7
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    // Count cards reviewed in this session
    const cardsReviewed = await db
      .select({ count: sql<number>`count(distinct ${reviews.cardId})::int` })
      .from(reviews)
      .where(eq(reviews.userId, this.userId))
      .then(res => res[0]?.count || 0)

    // Update user stats
    const stats = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, this.userId))
      .then(res => res[0])

    if (!stats) return

    // Check for streak
    const lastStudy = stats.lastStudyDate
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let newStreak = stats.currentStreak
    if (lastStudy) {
      const lastStudyDate = new Date(lastStudy)
      lastStudyDate.setHours(0, 0, 0, 0)

      if (lastStudyDate.getTime() === yesterday.getTime()) {
        // Studied yesterday, continue streak
        newStreak = stats.currentStreak + 1
      } else if (lastStudyDate.getTime() < yesterday.getTime()) {
        // Missed a day, reset streak
        newStreak = 1
      }
      // If studied today already, don't increment
    } else {
      newStreak = 1
    }

    const updateData: Record<string, any> = {
      totalSessions: stats.totalSessions + 1,
      currentStreak: newStreak,
      longestStreak: Math.max(stats.longestStreak, newStreak),
      lastStudyDate: new Date(),
      updatedAt: new Date(),
    }

    if (perfectSession) {
      updateData.perfectSessions = stats.perfectSessions + 1
    }
    if (isNight) {
      updateData.nightSessions = stats.nightSessions + 1
    }
    if (isEarly) {
      updateData.earlySessions = stats.earlySessions + 1
    }
    if (isWeekend) {
      updateData.weekendSessions = stats.weekendSessions + 1
    }

    await db
      .update(userStats)
      .set(updateData)
      .where(eq(userStats.userId, this.userId))

    // Check for new achievements
    await this.checkAchievements()
  }

  // Update stats after reviewing cards
  async updateAfterReview(correct: boolean, timeSeconds: number) {
    await this.initializeUserStats()

    const stats = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, this.userId))
      .then(res => res[0])

    if (!stats) return

    const updateData: Record<string, any> = {
      totalCardsReviewed: stats.totalCardsReviewed + 1,
      updatedAt: new Date(),
    }

    if (correct) {
      updateData.correctStreak = stats.correctStreak + 1
      updateData.longestCorrectStreak = Math.max(
        stats.longestCorrectStreak,
        stats.correctStreak + 1
      )
    } else {
      updateData.correctStreak = 0
    }

    await db
      .update(userStats)
      .set(updateData)
      .where(eq(userStats.userId, this.userId))
  }

  // Update stats after creating cards
  async updateAfterCardCreation(count: number = 1) {
    await this.initializeUserStats()

    await db
      .update(userStats)
      .set({
        totalCardsCreated: sql`${userStats.totalCardsCreated} + ${count}`,
        updatedAt: new Date(),
      })
      .where(eq(userStats.userId, this.userId))

    await this.checkAchievements()
  }

  // Update stats after creating a deck
  async updateAfterDeckCreation(language: string, isPublic: boolean) {
    await this.initializeUserStats()

    const stats = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, this.userId))
      .then(res => res[0])

    if (!stats) return

    const languages = JSON.parse(stats.languagesUsed || '[]')
    if (!languages.includes(language)) {
      languages.push(language)
    }

    const updateData: Record<string, any> = {
      decksCreated: stats.decksCreated + 1,
      languagesUsed: JSON.stringify(languages),
      updatedAt: new Date(),
    }

    if (isPublic) {
      updateData.publicDecks = stats.publicDecks + 1
    }

    await db
      .update(userStats)
      .set(updateData)
      .where(eq(userStats.userId, this.userId))

    await this.checkAchievements()
  }

  // Check for comeback achievement
  async checkComeback() {
    const stats = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, this.userId))
      .then(res => res[0])

    if (!stats || !stats.lastStudyDate) return false

    const daysSinceLastStudy = Math.floor(
      (Date.now() - new Date(stats.lastStudyDate).getTime()) / (1000 * 60 * 60 * 24)
    )

    return daysSinceLastStudy >= 7
  }

  // Check and unlock achievements
  async checkAchievements() {
    const stats = await db
      .select()
      .from(userStats)
      .where(eq(userStats.userId, this.userId))
      .then(res => res[0])

    if (!stats) return []

    // Get already unlocked achievements
    const unlocked = await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, this.userId))

    const unlockedIds = new Set(unlocked.map(u => u.achievementId))
    const newAchievements: string[] = []

    // Check each achievement
    for (const achievement of ACHIEVEMENTS) {
      if (unlockedIds.has(achievement.id)) continue

      let shouldUnlock = false

      switch (achievement.requirement.type) {
        case 'total_sessions':
          shouldUnlock = stats.totalSessions >= achievement.requirement.value
          break
        case 'streak_days':
          shouldUnlock = stats.currentStreak >= achievement.requirement.value
          break
        case 'total_cards_reviewed':
          shouldUnlock = stats.totalCardsReviewed >= achievement.requirement.value
          break
        case 'decks_created':
          shouldUnlock = stats.decksCreated >= achievement.requirement.value
          break
        case 'total_cards_created':
          shouldUnlock = stats.totalCardsCreated >= achievement.requirement.value
          break
        case 'languages_used':
          const languages = JSON.parse(stats.languagesUsed || '[]')
          shouldUnlock = languages.length >= achievement.requirement.value
          break
        case 'correct_streak':
          shouldUnlock = stats.longestCorrectStreak >= achievement.requirement.value
          break
        case 'perfect_sessions':
          shouldUnlock = stats.perfectSessions >= achievement.requirement.value
          break
        case 'night_study':
          shouldUnlock = stats.nightSessions >= achievement.requirement.value
          break
        case 'early_study':
          shouldUnlock = stats.earlySessions >= achievement.requirement.value
          break
        case 'weekend_sessions':
          shouldUnlock = stats.weekendSessions >= achievement.requirement.value
          break
        case 'public_decks':
          shouldUnlock = stats.publicDecks >= achievement.requirement.value
          break
        case 'comeback':
          shouldUnlock = await this.checkComeback()
          break
        case 'a_plus_grade':
          // Check if user has any deck with A+ grade
          const aPlus = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(deckScores)
            .where(and(
              eq(deckScores.userId, this.userId),
              gte(deckScores.accuracyPct, 95)
            ))
            .then(res => res[0]?.count || 0)
          shouldUnlock = aPlus >= achievement.requirement.value
          break
      }

      if (shouldUnlock) {
        await db.insert(userAchievements).values({
          userId: this.userId,
          achievementId: achievement.id,
        })
        newAchievements.push(achievement.id)
      }
    }

    return newAchievements
  }

  // Get user's achievements and progress
  async getUserAchievements() {
    const [unlocked, stats] = await Promise.all([
      db
        .select()
        .from(userAchievements)
        .where(eq(userAchievements.userId, this.userId)),
      db
        .select()
        .from(userStats)
        .where(eq(userStats.userId, this.userId))
        .then(res => res[0]),
    ])

    const unlockedIds = new Set(unlocked.map(u => u.achievementId))
    const achievements = ACHIEVEMENTS.map(achievement => {
      const isUnlocked = unlockedIds.has(achievement.id)
      const unlockedData = unlocked.find(u => u.achievementId === achievement.id)

      // Calculate progress
      let progress = 0
      let current = 0
      const target = achievement.requirement.value

      if (stats) {
        switch (achievement.requirement.type) {
          case 'total_sessions':
            current = stats.totalSessions
            break
          case 'streak_days':
            current = stats.currentStreak
            break
          case 'total_cards_reviewed':
            current = stats.totalCardsReviewed
            break
          case 'decks_created':
            current = stats.decksCreated
            break
          case 'total_cards_created':
            current = stats.totalCardsCreated
            break
          case 'languages_used':
            current = JSON.parse(stats.languagesUsed || '[]').length
            break
          case 'correct_streak':
            current = stats.longestCorrectStreak
            break
          case 'perfect_sessions':
            current = stats.perfectSessions
            break
          case 'night_study':
            current = stats.nightSessions
            break
          case 'early_study':
            current = stats.earlySessions
            break
          case 'weekend_sessions':
            current = stats.weekendSessions
            break
          case 'public_decks':
            current = stats.publicDecks
            break
        }
        progress = Math.min(100, (current / target) * 100)
      }

      return {
        ...achievement,
        unlocked: isUnlocked,
        unlockedAt: unlockedData?.unlockedAt || null,
        progress,
        current,
        target,
      }
    })

    const totalPoints = achievements
      .filter(a => a.unlocked)
      .reduce((sum, a) => sum + a.points, 0)

    return {
      achievements,
      totalPoints,
      stats,
    }
  }
}

// Export singleton functions for easy use
export async function trackSessionComplete(userId: string, sessionId: string, perfectSession: boolean) {
  const tracker = new AchievementTracker(userId)
  return tracker.updateAfterSession(sessionId, perfectSession)
}

export async function trackReview(userId: string, correct: boolean, timeSeconds: number) {
  const tracker = new AchievementTracker(userId)
  return tracker.updateAfterReview(correct, timeSeconds)
}

export async function trackCardsCreated(userId: string, count: number) {
  const tracker = new AchievementTracker(userId)
  return tracker.updateAfterCardCreation(count)
}

export async function trackDeckCreated(userId: string, language: string, isPublic: boolean) {
  const tracker = new AchievementTracker(userId)
  return tracker.updateAfterDeckCreation(language, isPublic)
}

export async function getUserAchievements(userId: string) {
  const tracker = new AchievementTracker(userId)
  return tracker.getUserAchievements()
}
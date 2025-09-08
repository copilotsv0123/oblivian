import { db } from '@/lib/db'
import { studySessions, type StudySession, type NewStudySession } from '@/lib/db/schema'
import { eq, and, desc, gte, isNull, sql } from 'drizzle-orm'
import { BaseRepository, CreateResult, UpdateResult, DeleteResult } from './base-repository'

export interface CreateStudySessionInput {
  userId: string
  deckId: string
}

export interface UpdateStudySessionInput {
  endedAt?: Date
  secondsActive?: number
}

export interface StudySessionStats {
  totalSessions: number
  totalTimeMinutes: number
  averageSessionMinutes: number
  sessionsLast7Days: number
  sessionsLast30Days: number
}

export class StudySessionRepository extends BaseRepository {
  async findById(sessionId: string): Promise<StudySession | null> {
    try {
      const session = await db
        .select()
        .from(studySessions)
        .where(eq(studySessions.id, sessionId))
        .get()
      
      return session || null
    } catch (error) {
      this.handleError(error, 'findById')
    }
  }

  async findByUserId(userId: string, limit = 50, offset = 0): Promise<StudySession[]> {
    try {
      this.validateRequiredFields({ userId }, ['userId'])
      
      const sessions = await db
        .select()
        .from(studySessions)
        .where(eq(studySessions.userId, userId))
        .orderBy(desc(studySessions.startedAt))
        .limit(limit)
        .offset(offset)
        .all()
      
      return sessions
    } catch (error) {
      this.handleError(error, 'findByUserId')
    }
  }

  async findByDeckId(deckId: string, limit = 50, offset = 0): Promise<StudySession[]> {
    try {
      this.validateRequiredFields({ deckId }, ['deckId'])
      
      const sessions = await db
        .select()
        .from(studySessions)
        .where(eq(studySessions.deckId, deckId))
        .orderBy(desc(studySessions.startedAt))
        .limit(limit)
        .offset(offset)
        .all()
      
      return sessions
    } catch (error) {
      this.handleError(error, 'findByDeckId')
    }
  }

  async findByUserAndDeck(userId: string, deckId: string, limit = 50): Promise<StudySession[]> {
    try {
      this.validateRequiredFields({ userId, deckId }, ['userId', 'deckId'])
      
      const sessions = await db
        .select()
        .from(studySessions)
        .where(and(
          eq(studySessions.userId, userId),
          eq(studySessions.deckId, deckId)
        ))
        .orderBy(desc(studySessions.startedAt))
        .limit(limit)
        .all()
      
      return sessions
    } catch (error) {
      this.handleError(error, 'findByUserAndDeck')
    }
  }

  async findActiveSession(userId: string, deckId?: string): Promise<StudySession | null> {
    try {
      this.validateRequiredFields({ userId }, ['userId'])
      
      const whereCondition = deckId 
        ? and(
            eq(studySessions.userId, userId),
            eq(studySessions.deckId, deckId),
            isNull(studySessions.endedAt)
          )
        : and(
            eq(studySessions.userId, userId),
            isNull(studySessions.endedAt)
          )

      const activeSession = await db
        .select()
        .from(studySessions)
        .where(whereCondition)
        .orderBy(desc(studySessions.startedAt))
        .get()
      
      return activeSession || null
    } catch (error) {
      this.handleError(error, 'findActiveSession')
    }
  }

  async findRecentByUserId(userId: string, days = 30): Promise<StudySession[]> {
    try {
      this.validateRequiredFields({ userId }, ['userId'])
      
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      
      const recentSessions = await db
        .select()
        .from(studySessions)
        .where(and(
          eq(studySessions.userId, userId),
          gte(studySessions.startedAt, cutoffDate)
        ))
        .orderBy(desc(studySessions.startedAt))
        .all()
      
      return recentSessions
    } catch (error) {
      this.handleError(error, 'findRecentByUserId')
    }
  }

  async create(input: CreateStudySessionInput): Promise<CreateResult<StudySession>> {
    try {
      this.validateRequiredFields(input, ['userId', 'deckId'])
      
      // Check if there's already an active session for this user
      const activeSession = await this.findActiveSession(input.userId)
      if (activeSession) {
        throw new Error('User already has an active study session')
      }
      
      const [newSession] = await db
        .insert(studySessions)
        .values({
          userId: input.userId,
          deckId: input.deckId,
        })
        .returning()

      return {
        success: true,
        data: newSession,
        id: newSession.id,
      }
    } catch (error) {
      this.handleError(error, 'create')
    }
  }

  async update(sessionId: string, input: UpdateStudySessionInput): Promise<UpdateResult<StudySession>> {
    try {
      this.validateRequiredFields({ sessionId }, ['sessionId'])

      const updateData: Partial<NewStudySession> = {}
      
      if (input.endedAt !== undefined) {
        updateData.endedAt = input.endedAt
      }
      
      if (input.secondsActive !== undefined) {
        updateData.secondsActive = input.secondsActive
      }

      if (Object.keys(updateData).length === 0) {
        return { success: true, changes: 0 }
      }

      const [updatedSession] = await db
        .update(studySessions)
        .set(updateData)
        .where(eq(studySessions.id, sessionId))
        .returning()

      return {
        success: true,
        data: updatedSession,
        changes: updatedSession ? 1 : 0,
      }
    } catch (error) {
      this.handleError(error, 'update')
    }
  }

  async updateWithOwnershipCheck(sessionId: string, userId: string, input: UpdateStudySessionInput): Promise<UpdateResult<StudySession>> {
    try {
      this.validateRequiredFields({ sessionId, userId }, ['sessionId', 'userId'])

      const updateData: Partial<NewStudySession> = {}
      
      if (input.endedAt !== undefined) {
        updateData.endedAt = input.endedAt
      }
      
      if (input.secondsActive !== undefined) {
        updateData.secondsActive = input.secondsActive
      }

      if (Object.keys(updateData).length === 0) {
        return { success: true, changes: 0 }
      }

      const [updatedSession] = await db
        .update(studySessions)
        .set(updateData)
        .where(and(
          eq(studySessions.id, sessionId),
          eq(studySessions.userId, userId)
        ))
        .returning()

      return {
        success: true,
        data: updatedSession,
        changes: updatedSession ? 1 : 0,
      }
    } catch (error) {
      this.handleError(error, 'updateWithOwnershipCheck')
    }
  }

  async endSession(sessionId: string, secondsActive?: number): Promise<UpdateResult<StudySession>> {
    try {
      this.validateRequiredFields({ sessionId }, ['sessionId'])
      
      const updateData: Partial<NewStudySession> = {
        endedAt: new Date(),
      }
      
      if (secondsActive !== undefined) {
        updateData.secondsActive = secondsActive
      }

      const [updatedSession] = await db
        .update(studySessions)
        .set(updateData)
        .where(eq(studySessions.id, sessionId))
        .returning()

      return {
        success: true,
        data: updatedSession,
        changes: updatedSession ? 1 : 0,
      }
    } catch (error) {
      this.handleError(error, 'endSession')
    }
  }

  async endAllActiveSessions(userId: string): Promise<{ success: boolean; updatedCount: number }> {
    try {
      this.validateRequiredFields({ userId }, ['userId'])
      
      const activeSessions = await db
        .select()
        .from(studySessions)
        .where(and(
          eq(studySessions.userId, userId),
          isNull(studySessions.endedAt)
        ))
        .all()

      if (activeSessions.length > 0) {
        await db
          .update(studySessions)
          .set({ endedAt: new Date() })
          .where(and(
            eq(studySessions.userId, userId),
            isNull(studySessions.endedAt)
          ))
      }

      return {
        success: true,
        updatedCount: activeSessions.length,
      }
    } catch (error) {
      this.handleError(error, 'endAllActiveSessions')
    }
  }

  async getStudyStats(userId: string, deckId?: string): Promise<StudySessionStats> {
    try {
      this.validateRequiredFields({ userId }, ['userId'])
      
      const whereCondition = deckId 
        ? and(eq(studySessions.userId, userId), eq(studySessions.deckId, deckId))
        : eq(studySessions.userId, userId)

      // Get overall stats
      const overallStats = await db
        .select({
          totalSessions: sql<number>`COUNT(*)`,
          totalSeconds: sql<number>`SUM(seconds_active)`,
          avgSeconds: sql<number>`AVG(seconds_active)`,
        })
        .from(studySessions)
        .where(whereCondition)
        .get()

      // Get last 7 days stats
      const last7Days = new Date()
      last7Days.setDate(last7Days.getDate() - 7)
      
      const recentStats7 = await db
        .select({
          count: sql<number>`COUNT(*)`
        })
        .from(studySessions)
        .where(and(
          whereCondition,
          gte(studySessions.startedAt, last7Days)
        ))
        .get()

      // Get last 30 days stats
      const last30Days = new Date()
      last30Days.setDate(last30Days.getDate() - 30)
      
      const recentStats30 = await db
        .select({
          count: sql<number>`COUNT(*)`
        })
        .from(studySessions)
        .where(and(
          whereCondition,
          gte(studySessions.startedAt, last30Days)
        ))
        .get()

      return {
        totalSessions: overallStats?.totalSessions || 0,
        totalTimeMinutes: Math.round((overallStats?.totalSeconds || 0) / 60),
        averageSessionMinutes: Math.round((overallStats?.avgSeconds || 0) / 60),
        sessionsLast7Days: recentStats7?.count || 0,
        sessionsLast30Days: recentStats30?.count || 0,
      }
    } catch (error) {
      this.handleError(error, 'getStudyStats')
    }
  }

  async delete(sessionId: string): Promise<DeleteResult> {
    try {
      this.validateRequiredFields({ sessionId }, ['sessionId'])

      await db.delete(studySessions).where(eq(studySessions.id, sessionId))

      return {
        success: true,
        deletedId: sessionId,
      }
    } catch (error) {
      this.handleError(error, 'delete')
    }
  }

  async deleteByUserId(userId: string): Promise<{ success: boolean; deletedCount: number }> {
    try {
      this.validateRequiredFields({ userId }, ['userId'])

      const sessionsToDelete = await this.findByUserId(userId)
      await db.delete(studySessions).where(eq(studySessions.userId, userId))

      return {
        success: true,
        deletedCount: sessionsToDelete.length,
      }
    } catch (error) {
      this.handleError(error, 'deleteByUserId')
    }
  }
}

export const studySessionRepository = new StudySessionRepository()
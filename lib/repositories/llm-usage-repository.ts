/**
 * Repository for LLM usage tracking and statistics
 */

import { eq, and, desc, asc, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { BaseRepository } from './base-repository'
import {
  llmUsageRecords,
  llmUsageStats,
  type LlmUsageRecord,
  type NewLlmUsageRecord,
  type LlmUsageStats,
  type NewLlmUsageStats
} from '@/lib/db/schema-postgres'
import type {
  GenerationRecord,
  UsageStats,
  TokenUsage
} from '@/lib/llm/types'

export class LlmUsageRepository extends BaseRepository {
  /**
   * Create a new usage record
   */
  async createUsageRecord(record: {
    userId: string
    type: 'cards' | 'deck' | 'event' | 'enhance'
    inputData: Record<string, any>
    modelUsed: string
    tokensUsed: TokenUsage
    costCents: number
    status: 'pending' | 'completed' | 'failed'
    duration: number
    provider: string
    requestId: string
    errorMessage?: string
    outputData?: Record<string, any>
  }): Promise<LlmUsageRecord> {
    const newRecord: NewLlmUsageRecord = {
      userId: record.userId,
      type: record.type,
      inputData: JSON.stringify(record.inputData),
      outputData: record.outputData ? JSON.stringify(record.outputData) : null,
      modelUsed: record.modelUsed,
      tokensInput: record.tokensUsed.input,
      tokensOutput: record.tokensUsed.output,
      tokensTotal: record.tokensUsed.total,
      costCents: record.costCents,
      status: record.status,
      errorMessage: record.errorMessage || null,
      duration: record.duration,
      provider: record.provider,
      requestId: record.requestId,
      completedAt: record.status === 'completed' ? new Date() : null,
    }

    const [created] = await db
      .insert(llmUsageRecords)
      .values(newRecord)
      .returning()

    // Update usage statistics if completed successfully
    if (record.status === 'completed') {
      await this.updateUsageStats(record.userId, record)
    }

    return created
  }

  /**
   * Update a usage record (e.g., when completing a pending record)
   */
  async updateUsageRecord(
    id: string,
    updates: Partial<Pick<LlmUsageRecord, 'status' | 'errorMessage' | 'outputData' | 'duration' | 'completedAt'>>
  ): Promise<LlmUsageRecord | null> {
    const updateData: any = {}

    if (updates.status) updateData.status = updates.status
    if (updates.errorMessage !== undefined) updateData.errorMessage = updates.errorMessage
    if (updates.outputData !== undefined) updateData.outputData = typeof updates.outputData === 'string' ? updates.outputData : JSON.stringify(updates.outputData)
    if (updates.duration !== undefined) updateData.duration = updates.duration
    if (updates.completedAt !== undefined) updateData.completedAt = updates.completedAt

    // Auto-set completedAt if status is completed
    if (updates.status === 'completed' && !updates.completedAt) {
      updateData.completedAt = new Date()
    }

    const [updated] = await db
      .update(llmUsageRecords)
      .set(updateData)
      .where(eq(llmUsageRecords.id, id))
      .returning()

    return updated || null
  }

  /**
   * Get usage records for a user
   */
  async findUserUsageRecords(
    userId: string,
    options: {
      limit?: number
      offset?: number
      status?: 'pending' | 'completed' | 'failed'
      type?: 'cards' | 'deck' | 'event' | 'enhance'
    } = {}
  ): Promise<LlmUsageRecord[]> {
    const { limit = 50, offset = 0, status, type } = options

    // Build where conditions
    const conditions = [eq(llmUsageRecords.userId, userId)]

    if (status) {
      conditions.push(eq(llmUsageRecords.status, status))
    }

    if (type) {
      conditions.push(eq(llmUsageRecords.type, type))
    }

    return await db
      .select()
      .from(llmUsageRecords)
      .where(and(...conditions))
      .orderBy(desc(llmUsageRecords.createdAt))
      .limit(limit)
      .offset(offset)
  }

  /**
   * Get usage statistics for a user and period
   */
  async findUsageStats(userId: string, period: string): Promise<LlmUsageStats | null> {
    const [stats] = await db
      .select()
      .from(llmUsageStats)
      .where(and(
        eq(llmUsageStats.userId, userId),
        eq(llmUsageStats.period, period)
      ))
      .limit(1)

    return stats || null
  }

  /**
   * Get usage statistics for multiple periods
   */
  async findUsageStatsRange(
    userId: string,
    startPeriod: string,
    endPeriod: string
  ): Promise<LlmUsageStats[]> {
    return await db
      .select()
      .from(llmUsageStats)
      .where(and(
        eq(llmUsageStats.userId, userId),
        sql`${llmUsageStats.period} >= ${startPeriod}`,
        sql`${llmUsageStats.period} <= ${endPeriod}`
      ))
      .orderBy(asc(llmUsageStats.period))
  }

  /**
   * Update usage statistics for a user and period
   */
  private async updateUsageStats(
    userId: string,
    record: {
      type: string
      tokensUsed: TokenUsage
      costCents: number
    }
  ): Promise<void> {
    const period = new Date().toISOString().slice(0, 7) // YYYY-MM format

    // Get existing stats or create new
    const existing = await this.findUsageStats(userId, period)

    if (existing) {
      // Update existing stats
      const requestsByType = JSON.parse(existing.requestsByType) as Record<string, number>
      requestsByType[record.type] = (requestsByType[record.type] || 0) + 1

      const newTotalRequests = existing.totalRequests + 1
      const newTotalTokens = existing.totalTokens + record.tokensUsed.total
      const newTotalCostCents = existing.totalCostCents + record.costCents
      const newAverageCostPerRequest = newTotalCostCents / newTotalRequests

      // Calculate success rate (we'll need to query for this)
      const successfulRequests = await this.getSuccessfulRequestsCount(userId, period)
      const successRate = (successfulRequests / newTotalRequests) * 100

      await db
        .update(llmUsageStats)
        .set({
          totalRequests: newTotalRequests,
          totalTokens: newTotalTokens,
          totalCostCents: newTotalCostCents,
          requestsByType: JSON.stringify(requestsByType),
          averageCostPerRequest: newAverageCostPerRequest,
          successRate: successRate,
          updatedAt: new Date(),
        })
        .where(eq(llmUsageStats.id, existing.id))
    } else {
      // Create new stats
      const requestsByType = { [record.type]: 1 }

      const newStats: NewLlmUsageStats = {
        userId,
        period,
        totalRequests: 1,
        totalTokens: record.tokensUsed.total,
        totalCostCents: record.costCents,
        requestsByType: JSON.stringify(requestsByType),
        averageCostPerRequest: record.costCents,
        successRate: 100, // First request is successful
      }

      await db
        .insert(llmUsageStats)
        .values(newStats)
    }
  }

  /**
   * Get count of successful requests for a user in a period
   */
  private async getSuccessfulRequestsCount(userId: string, period: string): Promise<number> {
    const startOfMonth = new Date(`${period}-01`)
    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0)

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(llmUsageRecords)
      .where(and(
        eq(llmUsageRecords.userId, userId),
        eq(llmUsageRecords.status, 'completed'),
        sql`${llmUsageRecords.createdAt} >= ${startOfMonth}`,
        sql`${llmUsageRecords.createdAt} <= ${endOfMonth}`
      ))

    return result?.count || 0
  }

  /**
   * Get monthly usage summary for a user
   */
  async getMonthlyUsageSummary(userId: string): Promise<{
    currentMonth: UsageStats | null
    previousMonth: UsageStats | null
    trend: {
      requestsChange: number
      tokensChange: number
      costChange: number
    }
  }> {
    const now = new Date()
    const currentPeriod = now.toISOString().slice(0, 7)
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousPeriod = previousMonth.toISOString().slice(0, 7)

    const [current, previous] = await Promise.all([
      this.findUsageStats(userId, currentPeriod),
      this.findUsageStats(userId, previousPeriod)
    ])

    const currentStats: UsageStats | null = current ? {
      period: current.period,
      totalRequests: current.totalRequests,
      totalTokens: current.totalTokens,
      totalCostCents: current.totalCostCents,
      requestsByType: JSON.parse(current.requestsByType),
      averageCostPerRequest: current.averageCostPerRequest,
      successRate: current.successRate
    } : null

    const previousStats: UsageStats | null = previous ? {
      period: previous.period,
      totalRequests: previous.totalRequests,
      totalTokens: previous.totalTokens,
      totalCostCents: previous.totalCostCents,
      requestsByType: JSON.parse(previous.requestsByType),
      averageCostPerRequest: previous.averageCostPerRequest,
      successRate: previous.successRate
    } : null

    const trend = {
      requestsChange: currentStats && previousStats
        ? ((currentStats.totalRequests - previousStats.totalRequests) / previousStats.totalRequests) * 100
        : 0,
      tokensChange: currentStats && previousStats
        ? ((currentStats.totalTokens - previousStats.totalTokens) / previousStats.totalTokens) * 100
        : 0,
      costChange: currentStats && previousStats
        ? ((currentStats.totalCostCents - previousStats.totalCostCents) / previousStats.totalCostCents) * 100
        : 0
    }

    return {
      currentMonth: currentStats,
      previousMonth: previousStats,
      trend
    }
  }

  /**
   * Get total usage across all users (admin function)
   */
  async getTotalUsage(period?: string): Promise<{
    totalRequests: number
    totalTokens: number
    totalCostCents: number
    uniqueUsers: number
  }> {
    const baseQuery = db
      .select({
        totalRequests: sql<number>`sum(${llmUsageStats.totalRequests})`,
        totalTokens: sql<number>`sum(${llmUsageStats.totalTokens})`,
        totalCostCents: sql<number>`sum(${llmUsageStats.totalCostCents})`,
        uniqueUsers: sql<number>`count(distinct ${llmUsageStats.userId})`
      })
      .from(llmUsageStats)

    const [result] = period
      ? await baseQuery.where(eq(llmUsageStats.period, period))
      : await baseQuery

    return {
      totalRequests: result?.totalRequests || 0,
      totalTokens: result?.totalTokens || 0,
      totalCostCents: result?.totalCostCents || 0,
      uniqueUsers: result?.uniqueUsers || 0
    }
  }
}
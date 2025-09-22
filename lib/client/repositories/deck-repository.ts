import { apiClient } from '@/lib/client/api-client'
import { BaseRepository } from './base-repository'

export interface DeckDetails<TDeck = unknown> {
  deck: TDeck
  cards?: unknown[]
}

export interface DeckStats {
  lastStudyDate: string | null
  totalSessions: number
  totalCardsReviewed: number
  performanceGrade: string | null
  successRate: number | null
  reviewCount: number
  isSessionSpecific: boolean
  sessionId: string | null
}

export interface DeckStatsResponse {
  stats: DeckStats
}

export class DeckRepository extends BaseRepository {
  constructor() {
    super(apiClient)
  }

  get<TDeck = unknown>(deckId: string) {
    return this.get<DeckDetails<TDeck>>(`/api/decks/${deckId}`)
  }

  async getStats(deckId: string, params: { sessionId?: string } = {}) {
    const searchParams = new URLSearchParams()

    if (params.sessionId) {
      searchParams.set('sessionId', params.sessionId)
    }

    const query = searchParams.toString()
    const result = await this.get<DeckStatsResponse>(
      `/api/decks/${deckId}/stats${query ? `?${query}` : ''}`
    )

    const stats = result?.stats ?? ({} as Partial<DeckStats>)

    return {
      stats: {
        lastStudyDate: stats.lastStudyDate ?? null,
        totalSessions: stats.totalSessions ?? 0,
        totalCardsReviewed: stats.totalCardsReviewed ?? 0,
        performanceGrade: stats.performanceGrade ?? null,
        successRate: stats.successRate ?? null,
        reviewCount: stats.reviewCount ?? 0,
        isSessionSpecific: stats.isSessionSpecific ?? false,
        sessionId: stats.sessionId ?? null,
      },
    } satisfies DeckStatsResponse
  }
}

export const deckRepo = new DeckRepository()

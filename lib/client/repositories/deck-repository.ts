import { apiClient } from '@/lib/client/api-client'
import { BaseRepository } from './base-repository'
import { DeckWithTags } from '@/lib/types/decks'
import { Card } from '@/lib/types/cards'

// API response version with string dates
export interface DeckResponse extends Omit<DeckWithTags, 'createdAt' | 'updatedAt'> {
  createdAt: string
  updatedAt: string
}

export interface DeckDetails<TDeck = DeckWithTags> {
  deck: TDeck
  cards?: Card[]
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

export interface CardPerformance {
  difficulty: "easy" | "medium" | "hard" | "unreviewed"
  successRate: number
  recentReviews: Array<"again" | "hard" | "good" | "easy">
}

export interface SimilarDeck {
  id: string
  title: string
  description: string | null
  level: string
  similarity: number
}

export interface CreateDeckData {
  title: string
  description?: string
  level?: string
  language?: string
  isPublic?: boolean
}

export interface UpdateDeckData {
  title?: string
  description?: string | null
  level?: string
  language?: string
  isPublic?: boolean
  tags?: string[]
}

export class DeckRepository extends BaseRepository {
  constructor() {
    super(apiClient)
  }

  getAll() {
    return this.get<{ decks: DeckResponse[] }>(`/api/decks`)
  }

  getById<TDeck = DeckResponse>(deckId: string) {
    return this.get<DeckDetails<TDeck>>(`/api/decks/${deckId}`)
  }

  create(data: CreateDeckData) {
    return this.post<{ deck: DeckResponse }>('/api/decks', data)
  }

  update(deckId: string, data: UpdateDeckData) {
    return this.put<{ deck: DeckResponse }>(`/api/decks/${deckId}`, data)
  }

  deleteDeck(deckId: string) {
    return this.delete<{ success: boolean }>(`/api/decks/${deckId}`)
  }

  async star(deckId: string) {
    return this.post<{ deck: { starred: boolean } }>(`/api/decks/${deckId}/star`)
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

  getCardPerformance(deckId: string) {
    return this.get<{ cardPerformance: Record<string, CardPerformance> }>(`/api/decks/${deckId}/card-performance`)
  }

  getSimilar(deckId: string) {
    return this.get<{ decks: SimilarDeck[], count: number }>(`/api/decks/${deckId}/similar`)
  }
}

export const deckRepo = new DeckRepository()

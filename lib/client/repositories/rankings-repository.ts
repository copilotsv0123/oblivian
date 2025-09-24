import { apiClient } from '@/lib/client/api-client'
import { BaseRepository } from './base-repository'

export interface RankedDeck {
  id: string
  title: string
  description?: string
  level: string
  language: string
  rank: number
  score: number
  usageCount: number
  stats: {
    cardsReviewed: number
    hoursStudied: number
    uniqueUsers: number
  }
}

export interface RankingsResponse {
  decks: RankedDeck[]
  total: number
}

export type RankingWindow = 'day' | 'week' | 'month' | 'all' | 'd7' | 'd30'

export class RankingsRepository extends BaseRepository {
  constructor() {
    super(apiClient)
  }

  getRankings(window: RankingWindow = 'week', limit: number = 20) {
    return this.get<RankingsResponse>(`/api/rankings?window=${window}&limit=${limit}`)
  }

  triggerUpdate() {
    return this.post<{ success: boolean }>('/api/rankings')
  }
}

export const rankingsRepo = new RankingsRepository()
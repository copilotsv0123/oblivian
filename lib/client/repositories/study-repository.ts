import { apiClient } from '@/lib/client/api-client'
import { BaseRepository } from './base-repository'

export interface StudyQueueStats {
  due: number
  new: number
  total: number
}

export interface StudyQueueResponse<TCard = unknown> {
  cards: TCard[]
  stats: StudyQueueStats
  warning: string | null
}

interface RawStudyQueueResponse<TCard> {
  cards?: TCard[]
  stats?: Partial<StudyQueueStats>
  warning?: string | null
}

export interface StudyHeatmapResponse {
  heatmapData: Record<string, { count: number; totalCards: number }>
}

export class StudyRepository extends BaseRepository {
  constructor() {
    super(apiClient)
  }

  async getQueue<TCard = unknown>(deckId: string, options: { limit?: number } = {}) {
    const searchParams = new URLSearchParams()

    if (typeof options.limit === 'number') {
      searchParams.set('limit', options.limit.toString())
    }

    const query = searchParams.toString()
    const result = await this.get<RawStudyQueueResponse<TCard>>(
      `/api/study/${deckId}/queue${query ? `?${query}` : ''}`
    )

    const cards = result.cards ?? []
    const stats = result.stats ?? {}

    return {
      cards,
      stats: {
        due: stats.due ?? 0,
        new: stats.new ?? 0,
        total: stats.total ?? cards.length,
      },
      warning: result.warning ?? null,
    } satisfies StudyQueueResponse<TCard>
  }

  async getHeatmap() {
    const result = await this.get<StudyHeatmapResponse>('/api/study/heatmap')

    return {
      heatmapData: result?.heatmapData ?? {},
    }
  }
}

export const studyRepo = new StudyRepository()

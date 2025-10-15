import { apiClient } from '@/lib/client/api-client'
import { BaseRepository } from './base-repository'
import type { QuizItem } from '@/lib/types/quiz'

export interface QuizQueueStats {
  due: number
  new: number
  total: number
}

export interface QuizQueueResponse<TItem = QuizItem> {
  items: TItem[]
  stats: QuizQueueStats
  warning: string | null
}

interface RawQuizQueueResponse<TItem> {
  items?: TItem[]
  stats?: Partial<QuizQueueStats>
  warning?: string | null
}

export class QuizRepository extends BaseRepository {
  constructor() {
    super(apiClient)
  }

  async getQueue<TItem = QuizItem>(deckId: string, options: { limit?: number } = {}) {
    const searchParams = new URLSearchParams()

    if (typeof options.limit === 'number') {
      searchParams.set('limit', options.limit.toString())
    }

    const query = searchParams.toString()
    const result = await this.get<RawQuizQueueResponse<TItem>>(
      `/api/quiz/${deckId}/queue${query ? `?${query}` : ''}`
    )

    const items = result.items ?? []
    const stats = result.stats ?? {}

    return {
      items,
      stats: {
        due: stats.due ?? 0,
        new: stats.new ?? 0,
        total: stats.total ?? items.length,
      },
      warning: result.warning ?? null,
    } satisfies QuizQueueResponse<TItem>
  }
}

export const quizRepo = new QuizRepository()

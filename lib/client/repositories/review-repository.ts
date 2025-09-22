import { apiClient } from '@/lib/client/api-client'
import { BaseRepository } from './base-repository'

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy'

export interface ReviewPayload {
  cardId: string
  rating: ReviewRating
  sessionId?: string | null
  timeSpent?: number
}

export interface ReviewResponse {
  success: boolean
  nextDue: string
  interval: number
}

export class ReviewRepository extends BaseRepository {
  constructor() {
    super(apiClient)
  }

  submit(deckId: string, payload: ReviewPayload) {
    return this.post<ReviewResponse>(`/api/study/${deckId}/review`, payload)
  }
}

export const reviewRepo = new ReviewRepository()

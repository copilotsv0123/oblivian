import { apiClient } from '@/lib/client/api-client'
import { BaseRepository } from './base-repository'

export interface StudySession {
  id: string
  deckId: string
  userId: string
  startedAt: string
  endedAt: string | null
  secondsActive: number | null
}

export interface StudySessionResponse {
  session: StudySession
}

export interface SessionPerformance {
  sessionId: string
  startedAt: string
  endedAt: string | null
  secondsActive: number
  totalReviews: number
  cardsReviewed: number
  performanceGrade: string | null
  successRate: number | null
}

export interface SessionPerformanceResponse {
  sessionPerformance: SessionPerformance
}

export interface UpdateSessionPayload {
  sessionId: string
  secondsActive: number
  perfectSession?: boolean
}

export class SessionRepository extends BaseRepository {
  constructor() {
    super(apiClient)
  }

  create(deckId: string) {
    return this.post<StudySessionResponse>(`/api/study/${deckId}/session`)
  }

  update(deckId: string, payload: UpdateSessionPayload) {
    return this.put<StudySessionResponse>(`/api/study/${deckId}/session`, payload)
  }

  getPerformance(sessionId: string) {
    return this.get<SessionPerformanceResponse>(`/api/sessions/${sessionId}/performance`)
  }
}

export const sessionRepo = new SessionRepository()

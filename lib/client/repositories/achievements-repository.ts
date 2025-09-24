import { apiClient } from '@/lib/client/api-client'
import { BaseRepository } from './base-repository'

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: string
  points: number
  requirement: {
    type: string
    value: number
  }
  unlocked: boolean
  unlockedAt: string | null
  progress: number
  current: number
  target: number
}

export interface UserStats {
  totalSessions: number
  totalCardsReviewed: number
  currentStreak: number
  longestStreak: number
}

export interface AchievementsResponse {
  achievements: Achievement[]
  totalPoints?: number
  stats?: UserStats
}

export class AchievementsRepository extends BaseRepository {
  constructor() {
    super(apiClient)
  }

  getAll() {
    return this.get<AchievementsResponse>('/api/achievements')
  }
}

export const achievementsRepo = new AchievementsRepository()
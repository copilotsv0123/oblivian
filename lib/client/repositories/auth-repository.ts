import { apiClient } from '@/lib/client/api-client'
import { BaseRepository } from './base-repository'

export interface User {
  id: string
  email: string
  name?: string
  avatarUrl?: string
}

export interface SessionResponse {
  authenticated: boolean
  user: User | null
  expiresAt?: string
}

export interface GoogleLoginResponse {
  url: string
}

export class AuthRepository extends BaseRepository {
  constructor() {
    super(apiClient)
  }

  getSession() {
    return this.get<SessionResponse>('/api/auth/session')
  }

  initiateGoogleLogin(returnUrl?: string) {
    return this.post<GoogleLoginResponse>('/api/auth/google/login', {
      returnUrl,
    })
  }

  logout() {
    return this.post<{ success: boolean }>('/api/auth/logout')
  }
}

export const authRepo = new AuthRepository()
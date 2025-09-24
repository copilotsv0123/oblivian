import { apiClient } from '@/lib/client/api-client'
import { BaseRepository } from './base-repository'

export interface ApiToken {
  id: string
  name: string
  token: string
  tokenPreview: string
  lastUsedAt: string | null
  createdAt: string
  expiresAt: string | null
}

export interface CreateTokenData {
  name: string
  expiresInDays?: number | null
}

export interface TokensResponse {
  tokens: ApiToken[]
}

export class TokenRepository extends BaseRepository {
  constructor() {
    super(apiClient)
  }

  getAll() {
    return this.get<TokensResponse>('/api/tokens')
  }

  create(data: CreateTokenData) {
    return this.post<{ token: ApiToken }>('/api/tokens', data)
  }

  deleteToken(tokenId: string) {
    return this.delete<{ success: boolean }>(`/api/tokens?id=${tokenId}`)
  }
}

export const tokenRepo = new TokenRepository()
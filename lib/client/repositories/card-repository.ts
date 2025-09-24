import { apiClient } from '@/lib/client/api-client'
import { BaseRepository } from './base-repository'

export interface CreateCardData {
  deckId: string
  type: 'basic' | 'cloze' | 'multiple_choice'
  front: string
  back?: string
  choices?: string
  explanation?: string
  advancedNotes?: string
  mnemotechnic?: string
}

export interface Card {
  id: string
  type: string
  front: string
  back?: string
  choices?: string
  explanation?: string
  advancedNotes?: string
  mnemotechnic?: string
}

export class CardRepository extends BaseRepository {
  constructor() {
    super(apiClient)
  }

  create(data: CreateCardData) {
    return this.post<{ card: Card }>('/api/cards', data)
  }

  getById(cardId: string) {
    return this.get<{ card: Card }>(`/api/cards/${cardId}`)
  }

  update(cardId: string, data: Partial<CreateCardData>) {
    return this.put<{ card: Card }>(`/api/cards/${cardId}`, data)
  }

  deleteCard(cardId: string) {
    return this.delete<{ success: boolean }>(`/api/cards/${cardId}`)
  }
}

export const cardRepo = new CardRepository()
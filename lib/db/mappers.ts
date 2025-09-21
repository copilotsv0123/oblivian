import { Card as DbCard } from './schema-postgres'
import { Card, Choice } from '@/lib/types/cards'

export function transformDbCardToApiCard(dbCard: DbCard): Card {
  // For now, only handle basic cards
  return {
    id: dbCard.id,
    deckId: dbCard.deckId,
    type: 'basic',
    front: dbCard.front,
    back: dbCard.back || '',
    advancedNotes: dbCard.advancedNotes || undefined,
    mnemotechnic: dbCard.mnemotechnic || undefined,
    createdAt: dbCard.createdAt || new Date(),
    updatedAt: dbCard.updatedAt || new Date(),
  }
}

export function transformDbCardsToApiCards(dbCards: DbCard[]): Card[] {
  return dbCards.map(transformDbCardToApiCard)
}
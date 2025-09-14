import { Card as DbCard } from './schema-postgres'
import { Card, Choice } from '@/lib/types/cards'

export function transformDbCardToApiCard(dbCard: DbCard): Card {
  const baseCard = {
    id: dbCard.id,
    deckId: dbCard.deckId,
    front: dbCard.front,
    advancedNotes: dbCard.advancedNotes || undefined,
    createdAt: dbCard.createdAt || new Date(),
    updatedAt: dbCard.updatedAt || new Date(),
  }

  switch (dbCard.type) {
    case 'basic':
      return {
        ...baseCard,
        type: 'basic',
        back: dbCard.back!,
      }
    
    case 'cloze':
      return {
        ...baseCard,
        type: 'cloze',
        back: dbCard.back!,
      }
    
    case 'multiple_choice':
      return {
        ...baseCard,
        type: 'multiple_choice',
        choices: typeof dbCard.choices === 'string'
          ? JSON.parse(dbCard.choices) as Choice[]
          : dbCard.choices ? (dbCard.choices as unknown as Choice[]) : [],
        explanation: dbCard.explanation || undefined,
      }
    
    case 'explain':
      return {
        ...baseCard,
        type: 'explain',
        explanation: dbCard.explanation!,
      }
    
    default:
      throw new Error(`Unknown card type: ${dbCard.type}`)
  }
}

export function transformDbCardsToApiCards(dbCards: DbCard[]): Card[] {
  return dbCards.map(transformDbCardToApiCard)
}
import { Card as DbCard } from './schema-postgres'
import { Card, Choice, CardType } from '@/lib/types/cards'

function parseChoices(raw: unknown): Choice[] {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null
        }

        const text = 'text' in item ? String(item.text ?? '') : ''
        const isCorrect = Boolean((item as { isCorrect?: unknown }).isCorrect)

        if (text.trim().length === 0) {
          return null
        }

        return { text, isCorrect }
      })
      .filter((choice): choice is Choice => Boolean(choice))
  } catch (error) {
    console.warn('Failed to parse card choices JSON', error)
    return []
  }
}

export function transformDbCardToApiCard(dbCard: DbCard): Card {
  const type = (dbCard.type as CardType) || 'basic'

  const base = {
    id: dbCard.id,
    deckId: dbCard.deckId,
    front: dbCard.front,
    advancedNotes: dbCard.advancedNotes ?? undefined,
    mnemonics: dbCard.mnemonics ?? undefined,
    createdAt: dbCard.createdAt ?? new Date(),
    updatedAt: dbCard.updatedAt ?? new Date(),
  }

  switch (type) {
    case 'cloze':
      return {
        ...base,
        type: 'cloze',
        back: dbCard.back || '',
      }
    case 'multiple_choice': {
      const choices = parseChoices(dbCard.choices)
      const correctChoice = choices.find((choice) => choice.isCorrect)

      return {
        ...base,
        type: 'multiple_choice',
        back: correctChoice?.text || dbCard.back || undefined,
        choices,
        explanation: dbCard.explanation ?? undefined,
      }
    }
    case 'explain':
      return {
        ...base,
        type: 'explain',
        explanation: dbCard.explanation || '',
      }
    case 'basic':
    default:
      return {
        ...base,
        type: 'basic',
        back: dbCard.back || '',
      }
  }
}

export function transformDbCardsToApiCards(dbCards: DbCard[]): Card[] {
  return dbCards.map(transformDbCardToApiCard)
}
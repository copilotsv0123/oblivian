import { randomUUID } from 'crypto'
import { cardRepository } from '@/lib/repositories/card-repository'
import { getDueCards } from '@/lib/fsrs/scheduler'
import { QuizItem, QuizQuestionType, MultipleChoiceQuizItem, FillBlankQuizItem, TrueFalseQuizItem } from '@/lib/types/quiz'
import type { Card, Choice } from '@/lib/types/cards'
import { checkDailyLoadWarning } from '@/lib/study/scoring'

interface QuizQueueResult {
  items: QuizItem[]
  dueCount: number
  newCount: number
  warning: string | null
}

const DEFAULT_LIMIT = 10

function shuffleArray<T>(items: T[]): T[] {
  const clone = [...items]
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[clone[i], clone[j]] = [clone[j], clone[i]]
  }
  return clone
}

function normalizeAnswer(text?: string | null): string | null {
  if (!text) return null
  const normalized = text.trim()
  return normalized.length ? normalized : null
}

function collectDeckAnswers(cards: Card[], excludeCardId: string): string[] {
  return cards
    .filter((card) => card.id !== excludeCardId)
    .map((card) => normalizeAnswer(card.back ?? card.explanation ?? null))
    .filter((answer): answer is string => Boolean(answer))
}

function pickDistractors(candidates: string[], count: number, exclude: Set<string>): string[] {
  const pool = candidates.filter((candidate) => !exclude.has(candidate.toLowerCase()))
  return shuffleArray(pool).slice(0, count)
}

function deriveQuestionType(card: Card): QuizQuestionType {
  if (card.type === 'multiple_choice' && Array.isArray(card.choices) && card.choices.length >= 3) {
    return 'multiple_choice'
  }

  if (card.type === 'cloze') {
    return 'fill_blank'
  }

  if (card.type === 'explain') {
    return 'fill_blank'
  }

  // Fall back to alternating between fill-in and true/false for variety
  return Math.random() < 0.5 ? 'fill_blank' : 'true_false'
}

function buildBaseItem(card: Card) {
  return {
    cardId: card.id,
    deckId: card.deckId,
    prompt: card.front,
    advancedNotes: card.advancedNotes,
    mnemonics: card.mnemonics,
  }
}

function buildMultipleChoiceItem(card: Card, deckCards: Card[]): MultipleChoiceQuizItem | null {
  const correctAnswer = normalizeAnswer(card.back ?? card.choices?.find((choice) => choice.isCorrect)?.text ?? null)
  if (!correctAnswer) {
    return null
  }

  let choices: Array<Choice & { id: string }>

  if (Array.isArray(card.choices) && card.choices.length >= 3) {
    choices = card.choices.map((choice, index) => ({
      ...choice,
      id: `${card.id}-choice-${index}`,
    }))
  } else {
    const candidates = collectDeckAnswers(deckCards, card.id)
    const exclude = new Set<string>([correctAnswer.toLowerCase()])
    const distractors = pickDistractors(candidates, 3, exclude)

    if (distractors.length < 2) {
      return null
    }

    const syntheticChoices: Array<Choice & { id: string }> = [
      {
        id: `${card.id}-choice-correct`,
        text: correctAnswer,
        isCorrect: true,
      },
      ...distractors.map((text, index) => ({
        id: `${card.id}-choice-d-${index}`,
        text,
        isCorrect: false,
      })),
    ]

    choices = shuffleArray(syntheticChoices)
  }

  const correctChoice = choices.find((choice) => choice.isCorrect)
  if (!correctChoice) {
    return null
  }

  return {
    id: `${card.id}-mc-${randomUUID()}`,
    type: 'multiple_choice',
    ...buildBaseItem(card),
    choices,
    correctChoiceId: correctChoice.id,
    explanation: card.explanation,
  }
}

function buildFillBlankItem(card: Card): FillBlankQuizItem | null {
  const answer = normalizeAnswer(card.back ?? card.explanation ?? null)
  if (!answer) {
    return null
  }

  const acceptableAnswers = Array.from(
    new Set(
      [answer]
        .concat(answer.split(/[;,]/).map((part) => part.trim()))
        .filter((part) => part.length > 0)
        .map((part) => part.toLowerCase())
    )
  )

  return {
    id: `${card.id}-fb-${randomUUID()}`,
    type: 'fill_blank',
    ...buildBaseItem(card),
    answer,
    acceptableAnswers,
    explanation: card.explanation,
  }
}

function buildTrueFalseItem(card: Card, deckCards: Card[]): TrueFalseQuizItem | null {
  const correctAnswer = normalizeAnswer(card.back ?? card.explanation ?? null)
  if (!correctAnswer) {
    return null
  }

  const candidates = collectDeckAnswers(deckCards, card.id)
  const useFalse = candidates.length > 0 && Math.random() < 0.5

  let statement = correctAnswer
  let isTrue = true

  if (useFalse) {
    const falseAnswer = pickDistractors(candidates, 1, new Set([correctAnswer.toLowerCase()]))[0]
    if (falseAnswer) {
      statement = falseAnswer
      isTrue = false
    }
  }

  return {
    id: `${card.id}-tf-${randomUUID()}`,
    type: 'true_false',
    ...buildBaseItem(card),
    statement,
    isTrue,
    explanation: card.explanation,
  }
}

function buildQuizItem(card: Card, deckCards: Card[]): QuizItem | null {
  const preferredType = deriveQuestionType(card)

  const builders: Array<() => QuizItem | null> = []

  if (preferredType === 'multiple_choice') {
    builders.push(() => buildMultipleChoiceItem(card, deckCards))
    builders.push(() => buildFillBlankItem(card))
    builders.push(() => buildTrueFalseItem(card, deckCards))
  } else if (preferredType === 'fill_blank') {
    builders.push(() => buildFillBlankItem(card))
    builders.push(() => buildMultipleChoiceItem(card, deckCards))
    builders.push(() => buildTrueFalseItem(card, deckCards))
  } else {
    builders.push(() => buildTrueFalseItem(card, deckCards))
    builders.push(() => buildMultipleChoiceItem(card, deckCards))
    builders.push(() => buildFillBlankItem(card))
  }

  for (const builder of builders) {
    const item = builder()
    if (item) {
      return item
    }
  }

  return null
}

export async function generateQuizQueue(userId: string, deckId: string, limit: number = DEFAULT_LIMIT): Promise<QuizQueueResult> {
  const queue = await getDueCards(userId, deckId, limit)
  const cardIds = [...queue.due, ...queue.new]

  if (cardIds.length === 0) {
    const warning = await checkDailyLoadWarning(userId, deckId)
    return {
      items: [],
      dueCount: 0,
      newCount: 0,
      warning,
    }
  }

  const deckCards = await cardRepository.findByDeckId(deckId, 200)
  const cardMap = new Map(deckCards.map((card) => [card.id, card]))

  const targetCards = cardIds
    .map((id) => cardMap.get(id))
    .filter((card): card is Card => Boolean(card))

  const quizItems = targetCards
    .map((card) => buildQuizItem(card, deckCards))
    .filter((item): item is QuizItem => Boolean(item))

  const limitedItems = quizItems.slice(0, limit)
  const warning = await checkDailyLoadWarning(userId, deckId)

  return {
    items: limitedItems,
    dueCount: queue.due.length,
    newCount: queue.new.length,
    warning,
  }
}

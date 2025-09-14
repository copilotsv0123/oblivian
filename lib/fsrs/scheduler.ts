import { fsrs, Rating, Card as FSRSCard, Grade, RecordLog, createEmptyCard } from 'ts-fsrs'
import { reviewRepository } from '@/lib/repositories/review-repository'
import { cardRepository } from '@/lib/repositories/card-repository'

const f = fsrs()

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy'

const ratingMap: Record<ReviewRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
}

export interface CardSchedule {
  cardId: string
  due: Date
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  reps: number
  lapses: number
  state: number
  learning_steps: number
  last_review?: Date
}

export async function getCardSchedule(cardId: string, userId: string): Promise<CardSchedule> {
  const userCardReviews = await reviewRepository.findByUserAndCard(userId, cardId)
  const lastReview = userCardReviews[0] // Already ordered by reviewedAt desc

  if (!lastReview || !lastReview.state) {
    const newCard = createEmptyCard()
    return {
      cardId,
      due: newCard.due,
      stability: newCard.stability,
      difficulty: newCard.difficulty,
      elapsed_days: newCard.elapsed_days,
      scheduled_days: newCard.scheduled_days,
      reps: newCard.reps,
      lapses: newCard.lapses,
      state: newCard.state,
      learning_steps: newCard.learning_steps,
    }
  }

  const state = JSON.parse(lastReview.state as string) as FSRSCard
  return {
    cardId,
    due: lastReview.scheduledAt,
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsed_days,
    scheduled_days: state.scheduled_days,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state,
    learning_steps: state.learning_steps,
    last_review: lastReview.reviewedAt || undefined,
  }
}

export async function scheduleReview(
  cardId: string,
  userId: string,
  rating: ReviewRating
): Promise<CardSchedule> {
  const schedule = await getCardSchedule(cardId, userId)
  
  const fsrsCard: FSRSCard = {
    due: schedule.due,
    stability: schedule.stability,
    difficulty: schedule.difficulty,
    elapsed_days: schedule.elapsed_days,
    scheduled_days: schedule.scheduled_days,
    reps: schedule.reps,
    lapses: schedule.lapses,
    state: schedule.state,
    learning_steps: schedule.learning_steps,
    last_review: schedule.last_review,
  }

  const now = new Date()
  const recordLog = f.repeat(fsrsCard, now)[ratingMap[rating]]
  const nextCard = recordLog.card

  await reviewRepository.create({
    userId,
    cardId,
    rating,
    scheduledAt: nextCard.due,
    intervalDays: nextCard.scheduled_days,
    stability: nextCard.stability,
    difficulty: nextCard.difficulty,
    state: nextCard,
  })

  return {
    cardId,
    due: nextCard.due,
    stability: nextCard.stability,
    difficulty: nextCard.difficulty,
    elapsed_days: nextCard.elapsed_days,
    scheduled_days: nextCard.scheduled_days,
    reps: nextCard.reps,
    lapses: nextCard.lapses,
    state: nextCard.state,
    learning_steps: nextCard.learning_steps,
    last_review: now,
  }
}

export async function getDueCards(userId: string, deckId: string, limit: number = 10) {
  return await cardRepository.findDueAndNewCards(userId, deckId, limit)
}
import { fsrs, Rating, Card as FSRSCard, Grade, RecordLog, createEmptyCard } from 'ts-fsrs'
import { db, reviews, cards } from '@/lib/db'
import { eq, and, lte, desc, isNull } from 'drizzle-orm'

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
  const lastReview = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.cardId, cardId), eq(reviews.userId, userId)))
    .orderBy(desc(reviews.reviewedAt))
    .get()

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

  await db.insert(reviews).values({
    userId,
    cardId,
    rating,
    scheduledAt: nextCard.due,
    reviewedAt: now,
    intervalDays: nextCard.scheduled_days,
    stability: nextCard.stability,
    difficulty: nextCard.difficulty,
    state: JSON.stringify(nextCard),
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

export async function getDueCards(userId: string, deckId: string, limit: number = 20) {
  const now = new Date()
  
  const dueReviews = await db
    .selectDistinct({
      cardId: reviews.cardId,
      scheduledAt: reviews.scheduledAt,
    })
    .from(reviews)
    .innerJoin(cards, eq(reviews.cardId, cards.id))
    .where(
      and(
        eq(reviews.userId, userId),
        eq(cards.deckId, deckId),
        lte(reviews.scheduledAt, now)
      )
    )
    .orderBy(reviews.scheduledAt)
    .limit(limit)
    .all()

  const newCards = await db
    .select()
    .from(cards)
    .leftJoin(reviews, and(
      eq(cards.id, reviews.cardId),
      eq(reviews.userId, userId)
    ))
    .where(
      and(
        eq(cards.deckId, deckId),
        isNull(reviews.id)
      )
    )
    .limit(Math.max(0, limit - dueReviews.length))
    .all()

  return {
    due: dueReviews.map(r => r.cardId),
    new: newCards.map(c => c.cards.id),
  }
}
import { withApiHandler, ApiContext } from '@/lib/middleware/api-wrapper'
import { db } from '@/lib/db'
import { decks, reviews, cards } from '@/lib/db'
import { eq, and, desc, sql, inArray } from 'drizzle-orm'

export const GET = withApiHandler(async ({ user }: ApiContext, routeContext: any) => {
  const { params } = routeContext as { params: Promise<{ id: string }> }
  const { id: deckId } = await params

  // Check if deck exists (allow any user to view any deck)
  const deck = await db
    .select()
    .from(decks)
    .where(eq(decks.id, deckId))
    .then(res => res[0] || null)

  if (!deck) {
    throw new Error('not found: Deck not found')
  }

  // Get all cards in the deck
  const deckCards = await db
    .select({ id: cards.id })
    .from(cards)
    .where(eq(cards.deckId, deckId))

  if (deckCards.length === 0) {
    return { cardPerformance: {} }
  }

  const cardIds = deckCards.map(c => c.id)

  // Get last 5 reviews for each card
  const cardReviews = await db
    .select({
      cardId: reviews.cardId,
      rating: reviews.rating,
      reviewedAt: reviews.reviewedAt,
    })
    .from(reviews)
    .where(and(
      eq(reviews.userId, user.id),
      inArray(reviews.cardId, cardIds)
    ))
    .orderBy(desc(reviews.reviewedAt))

  // Process reviews to calculate performance for each card
  const cardPerformance: Record<string, {
    difficulty: 'easy' | 'medium' | 'hard' | 'unreviewed'
    successRate: number
    recentReviews: Array<'again' | 'hard' | 'good' | 'easy'>
  }> = {}

  // Group reviews by card
  const reviewsByCard: Record<string, Array<{ rating: string, reviewedAt: Date }>> = {}
  for (const review of cardReviews) {
    if (!reviewsByCard[review.cardId]) {
      reviewsByCard[review.cardId] = []
    }
    reviewsByCard[review.cardId].push({
      rating: review.rating,
      reviewedAt: review.reviewedAt
    })
  }

  // Calculate performance for each card
  for (const cardId of cardIds) {
    const cardReviewList = reviewsByCard[cardId] || []

    if (cardReviewList.length === 0) {
      cardPerformance[cardId] = {
        difficulty: 'unreviewed',
        successRate: 0,
        recentReviews: []
      }
      continue
    }

    // Get last 5 reviews
    const recentReviews = cardReviewList
      .slice(0, 5)
      .map(r => r.rating as 'again' | 'hard' | 'good' | 'easy')

    // Calculate success rate
    const successCount = recentReviews.filter(r => r === 'good' || r === 'easy').length
    const successRate = successCount / recentReviews.length

    // Determine difficulty based on success rate
    let difficulty: 'easy' | 'medium' | 'hard' | 'unreviewed'
    if (successRate >= 0.8) {
      difficulty = 'easy'
    } else if (successRate >= 0.5) {
      difficulty = 'medium'
    } else {
      difficulty = 'hard'
    }

    cardPerformance[cardId] = {
      difficulty,
      successRate,
      recentReviews
    }
  }

  return { cardPerformance }
})
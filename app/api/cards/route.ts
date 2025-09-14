import { withApiHandler, getJsonBody, ApiContext } from '@/lib/middleware/api-wrapper'
import { CreateCardInput } from '@/lib/types/cards'
import { deckRepository, cardRepository } from '@/lib/repositories'
import { MAX_CARDS_PER_DECK } from '@/lib/constants'
import { trackCardsCreated } from '@/lib/achievements/tracker'

export const POST = withApiHandler(async ({ user, request }: ApiContext) => {
  const input: CreateCardInput = await getJsonBody(request)

  // Check if user owns the deck
  const deck = await deckRepository.findByIdAndUserId(input.deckId, user.id)
  if (!deck) {
    throw new Error('not found: Deck not found or unauthorized')
  }

  // Check card count limit
  const currentCardCount = await cardRepository.countByDeckId(input.deckId)
  if (currentCardCount >= MAX_CARDS_PER_DECK) {
    throw new Error(`bad request: Deck has reached the maximum limit of ${MAX_CARDS_PER_DECK} cards`)
  }

  const result = await cardRepository.create(input)

  // Track achievement progress
  await trackCardsCreated(user.id, 1)

  return { card: result.data }
})
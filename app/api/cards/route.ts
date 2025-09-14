import { withApiHandler, getJsonBody, ApiContext } from '@/lib/middleware/api-wrapper'
import { CreateCardInput } from '@/lib/types/cards'
import { deckRepository, cardRepository } from '@/lib/repositories'

export const POST = withApiHandler(async ({ user, request }: ApiContext) => {
  const input: CreateCardInput = await getJsonBody(request)

  // Check if user owns the deck
  const deck = await deckRepository.findByIdAndUserId(input.deckId, user.id)
  if (!deck) {
    throw new Error('not found: Deck not found or unauthorized')
  }

  // Check card count limit (500 cards max per deck)
  const currentCardCount = await cardRepository.countByDeckId(input.deckId)
  if (currentCardCount >= 500) {
    throw new Error('bad request: Deck has reached the maximum limit of 500 cards')
  }

  const result = await cardRepository.create(input)

  return { card: result.data }
})
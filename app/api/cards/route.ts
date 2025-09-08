import { withApiHandler, getJsonBody, ApiContext } from '@/lib/middleware/api-wrapper'
import { CreateCardInput } from '@/lib/types/cards'
import { deckRepository, cardRepository } from '@/lib/repositories'

export const POST = withApiHandler(async ({ user, request }: ApiContext) => {
  const input: CreateCardInput = await getJsonBody(request)
  const { deckId, type, front, back, choices, explanation } = input

  if (!deckId || !type || !front) {
    throw new Error('bad request: deckId, type, and front are required')
  }

  // Check if user owns the deck
  const deck = await deckRepository.findByIdAndUserId(deckId, user.id)
  if (!deck) {
    throw new Error('not found: Deck not found or unauthorized')
  }

  const result = await cardRepository.create(input)

  return { card: result.data }
})
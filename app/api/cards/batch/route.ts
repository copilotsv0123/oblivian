import { withApiHandler, getJsonBody, ApiContext } from '@/lib/middleware/api-wrapper'
import { cardRepository } from '@/lib/repositories'
import { CreateCardInput } from '@/lib/types/cards'
import { MAX_CARDS_PER_DECK } from '@/lib/constants'
import { trackCardsCreated } from '@/lib/achievements/tracker'

interface BatchImportRequest {
  deckId: string
  cards: Omit<CreateCardInput, 'deckId'>[]
}

export const POST = withApiHandler(async ({ user, request }: ApiContext) => {
  const body: BatchImportRequest = await getJsonBody(request)
  const { deckId, cards: cardInputs } = body

  if (!deckId) {
    throw new Error('bad request: deckId is required')
  }

  // Check card count limit
  const currentCardCount = await cardRepository.countByDeckId(deckId)
  const totalAfterImport = currentCardCount + cardInputs.length

  if (totalAfterImport > MAX_CARDS_PER_DECK) {
    const remainingSlots = Math.max(0, MAX_CARDS_PER_DECK - currentCardCount)
    throw new Error(`bad request: Cannot import ${cardInputs.length} cards. Deck currently has ${currentCardCount} cards. Maximum is ${MAX_CARDS_PER_DECK} cards per deck. You can add up to ${remainingSlots} more cards.`)
  }

  const result = await cardRepository.createBatchWithOwnershipCheck(
    deckId,
    user.id,
    cardInputs
  )

  // Track achievement progress
  if (result.success && result.cards) {
    await trackCardsCreated(user.id, result.cards.length)
  }

  return result
})
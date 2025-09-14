import { withApiHandler, getJsonBody, ApiContext } from '@/lib/middleware/api-wrapper'
import { cardRepository } from '@/lib/repositories'
import { CreateCardInput } from '@/lib/types/cards'

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

  // Check card count limit (500 cards max per deck)
  const currentCardCount = await cardRepository.countByDeckId(deckId)
  const totalAfterImport = currentCardCount + cardInputs.length

  if (totalAfterImport > 500) {
    const remainingSlots = Math.max(0, 500 - currentCardCount)
    throw new Error(`bad request: Cannot import ${cardInputs.length} cards. Deck currently has ${currentCardCount} cards. Maximum is 500 cards per deck. You can add up to ${remainingSlots} more cards.`)
  }

  const result = await cardRepository.createBatchWithOwnershipCheck(
    deckId,
    user.id,
    cardInputs
  )

  return result
})
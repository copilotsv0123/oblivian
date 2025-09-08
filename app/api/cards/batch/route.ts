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

  const result = await cardRepository.createBatchWithOwnershipCheck(
    deckId, 
    user.id, 
    cardInputs
  )

  return result
})
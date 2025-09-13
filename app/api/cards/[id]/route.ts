import { withApiHandler, getJsonBody, ApiContext } from '@/lib/middleware/api-wrapper'
import { cardRepository } from '@/lib/repositories'

export const GET = withApiHandler(async ({ user }: ApiContext, routeContext: any) => {
  const { params } = routeContext as { params: Promise<{ id: string }> }
  const { id } = await params
  
  const result = await cardRepository.findByIdWithDeckOwnership(id, user.id)
  
  if (!result) {
    throw new Error('not found: Card not found')
  }

  return { card: result.card, deck: result.deck }
})

export const PUT = withApiHandler(async ({ user, request }: ApiContext, routeContext: any) => {
  const { params } = routeContext as { params: Promise<{ id: string }> }
  const { id } = await params
  const { front, back, choices, explanation, advancedNotes } = await getJsonBody(request)

  const updatedCard = await cardRepository.updateWithOwnershipCheck(id, user.id, {
    front,
    back,
    choices,
    explanation,
    advancedNotes
  })

  return { card: updatedCard }
})

export const DELETE = withApiHandler(async ({ user }: ApiContext, routeContext: any) => {
  const { params } = routeContext as { params: Promise<{ id: string }> }
  const { id } = await params
  
  const result = await cardRepository.deleteWithOwnershipCheck(id, user.id)
  
  return { success: result.success }
})
import { withApiHandler, getJsonBody, ApiContext } from '@/lib/middleware/api-wrapper'
import { deckRepository } from '@/lib/repositories'

export const GET = withApiHandler(async ({ user }: ApiContext, routeContext: any) => {
  const { params } = routeContext as { params: Promise<{ id: string }> }
  const { id } = await params
  
  const result = await deckRepository.findByIdWithCards(id, user.id)
  
  if (!result) {
    throw new Error('not found: Deck not found')
  }

  return result
})

export const PUT = withApiHandler(async ({ user, request }: ApiContext, routeContext: any) => {
  const { params } = routeContext as { params: Promise<{ id: string }> }
  const { id } = await params
  const { title, description, level, language, isPublic } = await getJsonBody(request)

  const updatedDeck = await deckRepository.updateWithOwnershipCheck(id, user.id, {
    title,
    description,
    level,
    language,
    isPublic,
  })

  return { deck: updatedDeck }
})

export const DELETE = withApiHandler(async ({ user }: ApiContext, routeContext: any) => {
  const { params } = routeContext as { params: Promise<{ id: string }> }
  const { id } = await params
  const existingDeck = await deckRepository.findByIdAndUserId(id, user.id)

  if (!existingDeck) {
    throw new Error('not found: Deck not found')
  }

  await deckRepository.delete(id)

  return { success: true }
})
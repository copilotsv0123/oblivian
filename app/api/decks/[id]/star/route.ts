import { withApiHandler, ApiContext } from '@/lib/middleware/api-wrapper'
import { deckRepository } from '@/lib/repositories'

export const POST = withApiHandler(async ({ user }: ApiContext, routeContext: any) => {
  const { params } = routeContext as { params: Promise<{ id: string }> }
  const { id } = await params

  const updatedDeck = await deckRepository.toggleStar(id, user.id)

  return { deck: updatedDeck }
})
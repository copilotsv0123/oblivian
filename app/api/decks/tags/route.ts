import { withApiHandler, ApiContext } from '@/lib/middleware/api-wrapper'
import { deckRepository } from '@/lib/repositories'

export const GET = withApiHandler(async ({ user }: ApiContext) => {
  // Get all tags used by the current user's decks
  const userTags = await deckRepository.getUserTags(user.id)
  return { tags: userTags }
})
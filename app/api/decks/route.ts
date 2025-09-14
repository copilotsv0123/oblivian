import { withApiHandler, getJsonBody, ApiContext } from '@/lib/middleware/api-wrapper'
import { deckRepository } from '@/lib/repositories'
import { trackDeckCreated } from '@/lib/achievements/tracker'

export const GET = withApiHandler(async ({ user }: ApiContext) => {
  const userDecks = await deckRepository.findByUserId(user.id, true)
  return { decks: userDecks }
})

export const POST = withApiHandler(async ({ user, request }: ApiContext) => {
  const { title, description, level, language, isPublic } = await getJsonBody(request)

  if (!title) {
    throw new Error('bad request: Title is required')
  }

  const result = await deckRepository.create({
    userId: user.id,
    title,
    description,
    level,
    language,
    isPublic,
  })

  // Track achievement progress
  await trackDeckCreated(user.id, language || 'en', isPublic || false)

  return { deck: result.data }
})
import { withApiHandler, getJsonBody, ApiContext } from '@/lib/middleware/api-wrapper'
import { deckRepository } from '@/lib/repositories'
import { trackDeckCreated } from '@/lib/achievements/tracker'
import { DeckFilters } from '@/lib/types/decks'

export const GET = withApiHandler(async ({ user, request }: ApiContext) => {
  const url = new URL(request.url)
  const searchParams = url.searchParams

  // Parse query parameters for filtering
  const filters: DeckFilters = {}

  if (searchParams.get('search')) {
    filters.search = searchParams.get('search')!
  }

  if (searchParams.get('tags')) {
    filters.tags = searchParams.get('tags')!.split(',').map(tag => tag.trim()).filter(Boolean)
  }

  if (searchParams.get('starred')) {
    filters.starred = searchParams.get('starred') === 'true'
  }

  if (searchParams.get('level')) {
    filters.level = searchParams.get('level') as 'simple' | 'mid' | 'expert'
  }

  if (searchParams.get('language')) {
    filters.language = searchParams.get('language')!
  }

  // Use new filtering method if any filters are provided
  if (Object.keys(filters).length > 0) {
    const filteredDecks = await deckRepository.findByFilters(user.id, filters, true)
    return { decks: filteredDecks }
  }

  // Fallback to existing dashboard method
  const dashboardDecks = await deckRepository.findForDashboard(user.id)
  return { decks: dashboardDecks }
})

export const POST = withApiHandler(async ({ user, request }: ApiContext) => {
  const { title, description, level, language, isPublic, tags } = await getJsonBody(request)

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
    tags,
  })

  // Track achievement progress
  await trackDeckCreated(user.id, language || 'en', isPublic || false)

  return { deck: result.data }
})
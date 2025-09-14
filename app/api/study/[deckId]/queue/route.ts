import { withApiHandler, getParams, ApiContext } from '@/lib/middleware/api-wrapper'
import { deckRepository, cardRepository } from '@/lib/repositories'
import { getDueCards } from '@/lib/fsrs/scheduler'
import { inArray } from 'drizzle-orm'
import { transformDbCardsToApiCards } from '@/lib/db/mappers'
import { checkDailyLoadWarning } from '@/lib/study/scoring'

export const GET = withApiHandler(async ({ user, request }: ApiContext, routeContext: any) => {
  const { params } = routeContext as { params: Promise<{ deckId: string }> }
  const { deckId } = await params

  // Validate deck ownership
  const hasAccess = await deckRepository.validateOwnership(deckId, user.id)
  if (!hasAccess) {
    throw new Error('not found: Deck not found')
  }

  const searchParams = getParams(request)
  const limit = parseInt(searchParams.get('limit') || '10', 10)

  const queue = await getDueCards(user.id, deckId, limit)
  
  const allCardIds = [...queue.due, ...queue.new]
  
  if (allCardIds.length === 0) {
    return {
      cards: [],
      stats: {
        due: 0,
        new: 0,
        total: 0,
      },
    }
  }

  const queueCards = await cardRepository.findByIds(allCardIds)
  const cardMap = new Map(queueCards.map(c => [c.id, c]))
  const orderedCards = allCardIds
    .map(id => cardMap.get(id))
    .filter(Boolean)

  // Check for daily load warning
  const warning = await checkDailyLoadWarning(user.id, deckId)

  return {
    cards: orderedCards,
    stats: {
      due: queue.due.length,
      new: queue.new.length,
      total: orderedCards.length,
    },
    warning,
  }
})
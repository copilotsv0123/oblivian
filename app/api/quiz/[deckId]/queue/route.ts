import { withApiHandler, getParams, ApiContext } from '@/lib/middleware/api-wrapper'
import { deckRepository } from '@/lib/repositories'
import { generateQuizQueue } from '@/lib/quiz/generator'

export const GET = withApiHandler(async ({ user, request }: ApiContext, routeContext: any) => {
  const { params } = routeContext as { params: Promise<{ deckId: string }> }
  const { deckId } = await params

  const hasAccess = await deckRepository.validateOwnership(deckId, user.id)
  if (!hasAccess) {
    throw new Error('not found: Deck not found')
  }

  const searchParams = getParams(request)
  const limitParam = searchParams.get('limit')
  let limit: number | undefined
  if (limitParam) {
    const parsed = Number.parseInt(limitParam, 10)
    if (Number.isFinite(parsed) && parsed > 0) {
      limit = parsed
    }
  }

  const queue = await generateQuizQueue(user.id, deckId, limit)

  return {
    items: queue.items,
    stats: {
      due: queue.dueCount,
      new: queue.newCount,
      total: queue.items.length,
    },
    warning: queue.warning,
  }
})

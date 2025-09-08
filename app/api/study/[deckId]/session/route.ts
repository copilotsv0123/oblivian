import { withApiHandler, getJsonBody, ApiContext } from '@/lib/middleware/api-wrapper'
import { studySessionRepository } from '@/lib/repositories'

export const POST = withApiHandler(async ({ user }: ApiContext, routeContext: any) => {
  const { params } = routeContext as { params: Promise<{ deckId: string }> }
  const { deckId } = await params

  const result = await studySessionRepository.create({
    userId: user.id,
    deckId,
  })

  if (!result.success || !result.data) {
    throw new Error('Failed to create study session')
  }

  return { session: result.data }
})

export const PUT = withApiHandler(async ({ user, request }: ApiContext) => {
  const { sessionId, secondsActive } = await getJsonBody(request)

  if (!sessionId) {
    throw new Error('bad request: sessionId is required')
  }

  const result = await studySessionRepository.updateWithOwnershipCheck(
    sessionId, 
    user.id, 
    {
      endedAt: new Date(),
      secondsActive: secondsActive || 0,
    }
  )

  if (!result.success || !result.data) {
    throw new Error('Failed to update study session')
  }

  return { session: result.data }
})
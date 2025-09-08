import { withApiHandler, getJsonBody, ApiContext } from '@/lib/middleware/api-wrapper'
import { studySessionRepository, deckScoreRepository } from '@/lib/repositories'
import { scheduleReview, ReviewRating } from '@/lib/fsrs/scheduler'

export const POST = withApiHandler(async ({ user, request }: ApiContext, routeContext: any) => {
  const { params } = routeContext as { params: Promise<{ deckId: string }> }
  const { deckId } = await params
  const { cardId, rating, sessionId } = await getJsonBody(request)

  if (!cardId || !rating) {
    throw new Error('bad request: cardId and rating are required')
  }

  const validRatings: ReviewRating[] = ['again', 'hard', 'good', 'easy']
  if (!validRatings.includes(rating)) {
    throw new Error('bad request: Invalid rating')
  }

  const schedule = await scheduleReview(cardId, user.id, rating)

  if (sessionId) {
    // Get the session to calculate elapsed time
    const session = await studySessionRepository.findById(sessionId)

    if (session && session.startedAt && session.userId === user.id) {
      const endTime = new Date()
      const secondsActive = Math.floor(
        (endTime.getTime() - session.startedAt.getTime()) / 1000
      )

      await studySessionRepository.updateWithOwnershipCheck(
        sessionId,
        user.id,
        {
          endedAt: endTime,
          secondsActive,
        }
      )
    }
  }

  // Update deck score after review
  await deckScoreRepository.updateDeckScoreAfterReview(
    user.id,
    deckId,
    rating,
    schedule.stability
  )

  return {
    success: true,
    nextDue: schedule.due,
    interval: schedule.scheduled_days,
  }
})
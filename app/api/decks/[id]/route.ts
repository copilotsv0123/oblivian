import { withApiHandler, getJsonBody, ApiContext } from '@/lib/middleware/api-wrapper'
import { db, decks, cards } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { deckRepository } from '@/lib/repositories/deck-repository'

export const GET = withApiHandler(async ({ user }: ApiContext, routeContext: any) => {
  const { params } = routeContext as { params: Promise<{ id: string }> }
  const { id } = await params
  const deck = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, id), eq(decks.ownerUserId, user.id)))
    .get()

  if (!deck) {
    throw new Error('not found: Deck not found')
  }

  const deckCards = await db
    .select()
    .from(cards)
    .where(eq(cards.deckId, id))
    .all()

  return { deck, cards: deckCards }
})

export const PUT = withApiHandler(async ({ user, request }: ApiContext, routeContext: any) => {
  const { params } = routeContext as { params: Promise<{ id: string }> }
  const { id } = await params
  const { title, description, level, language, isPublic } = await getJsonBody(request)

  const existingDeck = await db
    .select()
    .from(decks)
    .where(and(eq(decks.id, id), eq(decks.ownerUserId, user.id)))
    .get()

  if (!existingDeck) {
    throw new Error('not found: Deck not found')
  }

  const [updatedDeck] = await db
    .update(decks)
    .set({
      title,
      description,
      level,
      language,
      isPublic,
      updatedAt: new Date(),
    })
    .where(and(eq(decks.id, id), eq(decks.ownerUserId, user.id)))
    .returning()

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
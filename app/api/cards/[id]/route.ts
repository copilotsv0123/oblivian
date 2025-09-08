import { withApiHandler, getJsonBody, ApiContext } from '@/lib/middleware/api-wrapper'
import { db, cards, decks } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { transformDbCardToApiCard } from '@/lib/db/transformers'
import { cardRepository } from '@/lib/repositories/card-repository'

export const GET = withApiHandler(async ({ user }: ApiContext, routeContext: any) => {
  const { params } = routeContext as { params: Promise<{ id: string }> }
  const { id } = await params
  const card = await db
    .select({
      card: cards,
      deck: decks,
    })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(and(eq(cards.id, id), eq(decks.ownerUserId, user.id)))
    .get()

  if (!card) {
    throw new Error('not found: Card not found')
  }

  const transformedCard = transformDbCardToApiCard(card.card)
  return { card: transformedCard, deck: card.deck }
})

export const PUT = withApiHandler(async ({ user, request }: ApiContext, routeContext: any) => {
  const { params } = routeContext as { params: Promise<{ id: string }> }
  const { id } = await params
  const { front, back, choices, explanation } = await getJsonBody(request)

  const existingCard = await db
    .select({
      card: cards,
      deck: decks,
    })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(and(eq(cards.id, id), eq(decks.ownerUserId, user.id)))
    .get()

  if (!existingCard) {
    throw new Error('not found: Card not found')
  }

  const [updatedCard] = await db
    .update(cards)
    .set({
      front,
      back,
      choices: choices ? JSON.stringify(choices) : undefined,
      explanation,
      updatedAt: new Date(),
    })
    .where(eq(cards.id, id))
    .returning()

  const transformedCard = transformDbCardToApiCard(updatedCard)
  return { card: transformedCard }
})

export const DELETE = withApiHandler(async ({ user }: ApiContext, routeContext: any) => {
  const { params } = routeContext as { params: Promise<{ id: string }> }
  const { id } = await params
  const existingCard = await db
    .select({
      card: cards,
      deck: decks,
    })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(and(eq(cards.id, id), eq(decks.ownerUserId, user.id)))
    .get()

  if (!existingCard) {
    throw new Error('not found: Card not found')
  }

  await cardRepository.delete(id)

  return { success: true }
})
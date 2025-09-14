import { db } from '@/lib/db'
import { cards, reviews, decks, type Card, type NewCard } from '@/lib/db'
import { eq, and, desc, inArray, lte, isNull } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { CreateCardInput, UpdateCardInput, Choice } from '@/lib/types/cards'
import { transformDbCardToApiCard, transformDbCardsToApiCards } from '@/lib/db/mappers'
import { BaseRepository, CreateResult, UpdateResult, DeleteResult } from './base-repository'

export class CardRepository extends BaseRepository {
  async findByDeckId(deckId: string, limit = 100, offset = 0) {
    const dbCards = await db
      .select()
      .from(cards)
      .where(eq(cards.deckId, deckId))
      .orderBy(desc(cards.createdAt))
      .limit(limit)
      .offset(offset)
      
    
    return transformDbCardsToApiCards(dbCards)
  }

  async findById(cardId: string) {
    const card = await db
      .select()
      .from(cards)
      .where(eq(cards.id, cardId))
      .then(res => res[0] || null)
    
    return card ? transformDbCardToApiCard(card) : null
  }

  async findByIds(cardIds: string[]) {
    if (cardIds.length === 0) return []
    
    const dbCards = await db
      .select()
      .from(cards)
      .where(inArray(cards.id, cardIds))
      
    
    return transformDbCardsToApiCards(dbCards)
  }

  async create(input: CreateCardInput): Promise<CreateResult<any>> {
    try {
      this.validateRequiredFields(input, ['deckId', 'type', 'front'])
      this.validateCard(input)
      
      const [newCard] = await db.insert(cards).values({
        deckId: input.deckId,
        type: input.type,
        front: input.front,
        back: input.back || null,
        choices: input.choices ? JSON.stringify(input.choices) : null,
        explanation: input.explanation || null,
        advancedNotes: input.advancedNotes || null,
      }).returning()
      
      const transformedCard = transformDbCardToApiCard(newCard)
      return {
        success: true,
        data: transformedCard,
        id: newCard.id,
      }
    } catch (error) {
      this.handleError(error, 'create')
    }
  }

  async createBatch(deckId: string, cardInputs: Omit<CreateCardInput, 'deckId'>[]) {
    // Use a transaction for batch insert
    const createdCards = await db.transaction(async (tx) => {
      const batchCreated = []
      for (const input of cardInputs) {
        const cardId = randomUUID()
        const fullInput = { ...input, deckId }

        this.validateCard(fullInput)

        const [newCard] = await tx.insert(cards).values({
          id: cardId,
          deckId,
          type: fullInput.type,
          front: fullInput.front,
          back: fullInput.back || null,
          choices: fullInput.choices ? JSON.stringify(fullInput.choices) : null,
          explanation: fullInput.explanation || null,
          advancedNotes: fullInput.advancedNotes || null,
        }).returning()

        batchCreated.push(newCard)
      }
      return batchCreated
    })
    
    return transformDbCardsToApiCards(createdCards)
  }

  async createBatchWithOwnershipCheck(deckId: string, userId: string, cardInputs: Omit<CreateCardInput, 'deckId'>[]) {
    try {
      this.validateRequiredFields({ deckId, userId }, ['deckId', 'userId'])
      
      if (!cardInputs || !Array.isArray(cardInputs)) {
        throw new Error('bad request: cards array is required')
      }

      if (cardInputs.length === 0) {
        throw new Error('bad request: At least one card is required')
      }

      if (cardInputs.length > 100) {
        throw new Error('bad request: Maximum 100 cards can be imported at once')
      }

      // Check deck ownership
      const deck = await db
        .select()
        .from(decks)
        .where(and(eq(decks.id, deckId), eq(decks.ownerUserId, userId)))
        .then(res => res[0] || null)

      if (!deck) {
        throw new Error('not found: Deck not found')
      }

      // Validate all cards first
      const validationErrors: Record<number, string> = {}
      
      cardInputs.forEach((card, index) => {
        try {
          const fullInput = { ...card, deckId }
          this.validateCard(fullInput)
        } catch (error) {
          validationErrors[index] = error instanceof Error ? error.message : 'Validation error'
        }
      })

      if (Object.keys(validationErrors).length > 0) {
        throw new Error(`Validation errors: ${JSON.stringify(validationErrors)}`)
      }

      let createdCards: Card[] = []
      
      // Use a transaction for batch insert
      createdCards = await db.transaction(async (tx) => {
        const batchCreated = []
        for (const input of cardInputs) {
          const cardId = randomUUID()
          const fullInput = { ...input, deckId }

          const [newCard] = await tx.insert(cards).values({
            id: cardId,
            deckId,
            type: fullInput.type,
            front: fullInput.front,
            back: fullInput.back || null,
            choices: fullInput.choices ? JSON.stringify(fullInput.choices) : null,
            explanation: fullInput.explanation || null,
            advancedNotes: fullInput.advancedNotes || null,
          }).returning()

          batchCreated.push(newCard)
        }
        return batchCreated
      })
      
      const transformedCards = transformDbCardsToApiCards(createdCards)
      
      return {
        success: true,
        count: transformedCards.length,
        cards: transformedCards,
      }
    } catch (error) {
      this.handleError(error, 'createBatchWithOwnershipCheck')
    }
  }

  async update(cardId: string, input: UpdateCardInput) {
    const updateData: Partial<typeof cards.$inferInsert> = {}

    if (input.type !== undefined) updateData.type = input.type
    if (input.front !== undefined) updateData.front = input.front
    if (input.back !== undefined) updateData.back = input.back
    if (input.choices !== undefined) updateData.choices = JSON.stringify(input.choices)
    if (input.explanation !== undefined) updateData.explanation = input.explanation
    if (input.advancedNotes !== undefined) updateData.advancedNotes = input.advancedNotes
    
    if (Object.keys(updateData).length === 0) {
      return null
    }
    
    updateData.updatedAt = new Date()
    
    const [updated] = await db
      .update(cards)
      .set(updateData)
      .where(eq(cards.id, cardId))
      .returning()
    
    return updated ? transformDbCardToApiCard(updated) : null
  }

  async delete(cardId: string): Promise<DeleteResult> {
    try {
      this.validateRequiredFields({ cardId }, ['cardId'])
      await db.delete(cards).where(eq(cards.id, cardId))
      return {
        success: true,
        deletedId: cardId,
      }
    } catch (error) {
      this.handleError(error, 'delete')
    }
  }

  async findDueAndNewCards(userId: string, deckId: string, limit = 10) {
    try {
      this.validateRequiredFields({ userId, deckId }, ['userId', 'deckId'])

      const now = new Date()

      // First, get all reviews for cards in this deck to find the latest review per card
      const allReviews = await db
        .select({
          cardId: reviews.cardId,
          scheduledAt: reviews.scheduledAt,
          reviewedAt: reviews.reviewedAt,
        })
        .from(reviews)
        .innerJoin(cards, eq(reviews.cardId, cards.id))
        .where(
          and(
            eq(reviews.userId, userId),
            eq(cards.deckId, deckId)
          )
        )
        .orderBy(desc(reviews.reviewedAt))

      // Get the latest review per card
      const latestReviewPerCard = new Map()
      allReviews.forEach(review => {
        if (!latestReviewPerCard.has(review.cardId) ||
            review.reviewedAt > latestReviewPerCard.get(review.cardId).reviewedAt) {
          latestReviewPerCard.set(review.cardId, review)
        }
      })

      // Separate actually due cards from future cards
      const actuallyDueCards: Array<{cardId: string, scheduledAt: Date, reviewedAt: Date}> = []
      const futureCards: Array<{cardId: string, scheduledAt: Date, reviewedAt: Date}> = []

      latestReviewPerCard.forEach(review => {
        if (review.scheduledAt <= now) {
          actuallyDueCards.push(review)
        } else {
          futureCards.push(review)
        }
      })

      // Sort future cards by how soon they're due (earliest first)
      futureCards.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())

      // Calculate how many new cards we can take
      const maxNewCards = Math.max(0, limit - actuallyDueCards.length)

      // Get new cards (cards that have never been reviewed by this user)
      const newCardsQuery = await db
        .select()
        .from(cards)
        .leftJoin(reviews, and(
          eq(cards.id, reviews.cardId),
          eq(reviews.userId, userId)
        ))
        .where(
          and(
            eq(cards.deckId, deckId),
            isNull(reviews.id)
          )
        )
        .limit(maxNewCards)

      const newCards = newCardsQuery.map(c => c.cards.id)

      // Calculate how many more cards we need after due + new
      const currentCount = actuallyDueCards.length + newCards.length
      const needMoreCards = Math.max(0, limit - currentCount)

      // If we still need more cards, add future cards (bring them forward)
      const additionalCards = futureCards.slice(0, needMoreCards)

      return {
        due: [
          ...actuallyDueCards.map(r => r.cardId),
          ...additionalCards.map(r => r.cardId) // Include future cards if needed
        ],
        new: newCards,
      }
    } catch (error) {
      this.handleError(error, 'findDueAndNewCards')
    }
  }

  async findByIdWithDeckOwnership(cardId: string, userId: string) {
    try {
      this.validateRequiredFields({ cardId, userId }, ['cardId', 'userId'])
      
      const result = await db
        .select({
          card: cards,
          deck: decks,
        })
        .from(cards)
        .innerJoin(decks, eq(cards.deckId, decks.id))
        .where(and(eq(cards.id, cardId), eq(decks.ownerUserId, userId)))
        .then(res => res[0] || null)

      if (!result) {
        return null
      }

      return {
        card: transformDbCardToApiCard(result.card),
        deck: result.deck
      }
    } catch (error) {
      this.handleError(error, 'findByIdWithDeckOwnership')
    }
  }

  async updateWithOwnershipCheck(cardId: string, userId: string, updateData: { front?: string, back?: string, choices?: any, explanation?: string, advancedNotes?: string }) {
    try {
      this.validateRequiredFields({ cardId, userId }, ['cardId', 'userId'])
      
      // First check ownership
      const existingCard = await db
        .select({
          card: cards,
          deck: decks,
        })
        .from(cards)
        .innerJoin(decks, eq(cards.deckId, decks.id))
        .where(and(eq(cards.id, cardId), eq(decks.ownerUserId, userId)))
        .then(res => res[0] || null)

      if (!existingCard) {
        throw new Error('not found: Card not found')
      }

      // Update the card
      const [updatedCard] = await db
        .update(cards)
        .set({
          front: updateData.front,
          back: updateData.back,
          choices: updateData.choices ? JSON.stringify(updateData.choices) : undefined,
          explanation: updateData.explanation,
          advancedNotes: updateData.advancedNotes,
          updatedAt: new Date(),
        })
        .where(eq(cards.id, cardId))
        .returning()

      return transformDbCardToApiCard(updatedCard)
    } catch (error) {
      this.handleError(error, 'updateWithOwnershipCheck')
    }
  }

  async deleteWithOwnershipCheck(cardId: string, userId: string): Promise<DeleteResult> {
    try {
      this.validateRequiredFields({ cardId, userId }, ['cardId', 'userId'])
      
      // First check ownership
      const existingCard = await db
        .select({
          card: cards,
          deck: decks,
        })
        .from(cards)
        .innerJoin(decks, eq(cards.deckId, decks.id))
        .where(and(eq(cards.id, cardId), eq(decks.ownerUserId, userId)))
        .then(res => res[0] || null)

      if (!existingCard) {
        throw new Error('not found: Card not found')
      }

      // Delete the card
      await db.delete(cards).where(eq(cards.id, cardId))

      return {
        success: true,
        deletedId: cardId,
      }
    } catch (error) {
      this.handleError(error, 'deleteWithOwnershipCheck')
    }
  }

  async deleteBatchWithOwnershipCheck(cardIds: string[], userId: string) {
    try {
      this.validateRequiredFields({ userId }, ['userId'])
      
      if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
        throw new Error('bad request: cardIds array is required and cannot be empty')
      }

      if (cardIds.length > 100) {
        throw new Error('bad request: Maximum 100 cards can be deleted at once')
      }

      // Check ownership for all cards
      const existingCards = await db
        .select({
          cardId: cards.id,
          deckId: cards.deckId,
        })
        .from(cards)
        .innerJoin(decks, eq(cards.deckId, decks.id))
        .where(and(
          inArray(cards.id, cardIds),
          eq(decks.ownerUserId, userId)
        ))
        

      const foundCardIds = existingCards.map(c => c.cardId)
      const notFoundIds = cardIds.filter(id => !foundCardIds.includes(id))
      
      // Only proceed with cards that exist and are owned by the user
      if (foundCardIds.length === 0) {
        // No cards found to delete, return success with zero count
        return {
          success: true,
          deletedCount: 0,
          deletedIds: [],
          skippedIds: cardIds,
          message: 'No cards found to delete (already deleted or access denied)',
        }
      }

      // Delete only the found cards in a transaction
      await db.transaction(async (tx) => {
        return tx.delete(cards).where(inArray(cards.id, foundCardIds))
      })
      
      const deletedCount = foundCardIds.length

      return {
        success: true,
        deletedCount,
        deletedIds: foundCardIds,
        skippedIds: notFoundIds.length > 0 ? notFoundIds : undefined,
        message: notFoundIds.length > 0 
          ? `Deleted ${foundCardIds.length} cards, skipped ${notFoundIds.length} (already deleted or not found)`
          : undefined,
      }
    } catch (error) {
      this.handleError(error, 'deleteBatchWithOwnershipCheck')
    }
  }

  async updateBatchWithOwnershipCheck(
    userId: string,
    updates: Array<{
      cardId: string,
      front?: string,
      back?: string,
      choices?: any,
      explanation?: string,
      advancedNotes?: string
    }>
  ) {
    try {
      this.validateRequiredFields({ userId }, ['userId'])

      if (!updates || !Array.isArray(updates) || updates.length === 0) {
        throw new Error('bad request: updates array is required and cannot be empty')
      }

      if (updates.length > 100) {
        throw new Error('bad request: Maximum 100 cards can be updated at once')
      }

      // Validate all updates have cardId
      updates.forEach((update, index) => {
        if (!update.cardId) {
          throw new Error(`bad request: cardId is required for update at index ${index}`)
        }
      })

      const cardIds = updates.map(u => u.cardId)

      // Check ownership for all cards
      const existingCards = await db
        .select({
          cardId: cards.id,
          deckId: cards.deckId,
        })
        .from(cards)
        .innerJoin(decks, eq(cards.deckId, decks.id))
        .where(and(
          inArray(cards.id, cardIds),
          eq(decks.ownerUserId, userId)
        ))
        

      const foundCardIds = existingCards.map(c => c.cardId)
      const notFoundIds = cardIds.filter(id => !foundCardIds.includes(id))

      if (foundCardIds.length === 0) {
        return {
          success: true,
          updatedCount: 0,
          updatedCards: [],
          skippedIds: cardIds,
          message: 'No cards found to update (not found or access denied)',
        }
      }

      const updatedCards: ReturnType<typeof transformDbCardToApiCard>[] = []

      // Update cards in a transaction
      await db.transaction(async (tx) => {
        for (const update of updates) {
          if (foundCardIds.includes(update.cardId)) {
            const updateData: Partial<typeof cards.$inferInsert> = {}

            if (update.front !== undefined) updateData.front = update.front
            if (update.back !== undefined) updateData.back = update.back
            if (update.choices !== undefined) updateData.choices = typeof update.choices === 'string' ? update.choices : JSON.stringify(update.choices)
            if (update.explanation !== undefined) updateData.explanation = update.explanation
            if (update.advancedNotes !== undefined) updateData.advancedNotes = update.advancedNotes

            if (Object.keys(updateData).length > 0) {
              updateData.updatedAt = new Date()

              const [updatedCard] = await tx
                .update(cards)
                .set(updateData)
                .where(eq(cards.id, update.cardId))
                .returning()

              updatedCards.push(transformDbCardToApiCard(updatedCard))
            }
          }
        }
      })

      return {
        success: true,
        updatedCount: updatedCards.length,
        updatedCards,
        skippedIds: notFoundIds.length > 0 ? notFoundIds : undefined,
        message: notFoundIds.length > 0
          ? `Updated ${updatedCards.length} cards, skipped ${notFoundIds.length} (not found or access denied)`
          : undefined,
      }
    } catch (error) {
      this.handleError(error, 'updateBatchWithOwnershipCheck')
    }
  }

  private validateCard(input: CreateCardInput) {
    if (input.type === 'basic' || input.type === 'cloze') {
      if (!input.back) {
        throw new Error(`Card type ${input.type} requires 'back' field`)
      }
    }
    
    if (input.type === 'multiple_choice') {
      if (!input.choices) {
        throw new Error('Multiple choice cards require choices')
      }
      
      // Handle choices as either array or JSON string
      let choices = input.choices
      if (typeof choices === 'string') {
        try {
          choices = JSON.parse(choices)
        } catch {
          // If it's not valid JSON, skip validation (it might be plain text or other format)
          return
        }
      }
      
      if (Array.isArray(choices)) {
        if (choices.length < 2) {
          throw new Error('Multiple choice cards require at least 2 choices')
        }
        const correctChoices = choices.filter(c => c && c.isCorrect)
        if (correctChoices.length !== 1) {
          throw new Error('Multiple choice cards must have exactly one correct choice')
        }
      }
    }
    
    if (input.type === 'explain' && !input.explanation) {
      throw new Error('Explain cards require an explanation')
    }
  }
}

export const cardRepository = new CardRepository()
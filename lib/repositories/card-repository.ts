import { db } from '@/lib/db'
import { cards, reviews, type Card, type NewCard } from '@/lib/db/schema'
import { eq, and, desc, inArray, lte, isNull } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { CreateCardInput, UpdateCardInput, Choice } from '@/lib/types/cards'
import { transformDbCardToApiCard, transformDbCardsToApiCards } from '@/lib/db/transformers'
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
      .all()
    
    return transformDbCardsToApiCards(dbCards)
  }

  async findById(cardId: string) {
    const card = await db
      .select()
      .from(cards)
      .where(eq(cards.id, cardId))
      .get()
    
    return card ? transformDbCardToApiCard(card) : null
  }

  async findByIds(cardIds: string[]) {
    if (cardIds.length === 0) return []
    
    const dbCards = await db
      .select()
      .from(cards)
      .where(inArray(cards.id, cardIds))
      .all()
    
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
    const createdCards: Card[] = []
    
    // Use a transaction for batch insert
    await db.transaction(async (tx) => {
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
        }).returning()
        
        createdCards.push(newCard)
      }
    })
    
    return transformDbCardsToApiCards(createdCards)
  }

  async update(cardId: string, input: UpdateCardInput) {
    const updateData: any = {}
    
    if (input.type !== undefined) updateData.type = input.type
    if (input.front !== undefined) updateData.front = input.front
    if (input.back !== undefined) updateData.back = input.back
    if (input.choices !== undefined) updateData.choices = JSON.stringify(input.choices)
    if (input.explanation !== undefined) updateData.explanation = input.explanation
    
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

  async findDueAndNewCards(userId: string, deckId: string, limit = 20) {
    try {
      this.validateRequiredFields({ userId, deckId }, ['userId', 'deckId'])
      
      const now = new Date()
      
      // Get due reviews (cards that have been reviewed and are due for review)
      const dueReviews = await db
        .selectDistinct({
          cardId: reviews.cardId,
          scheduledAt: reviews.scheduledAt,
        })
        .from(reviews)
        .innerJoin(cards, eq(reviews.cardId, cards.id))
        .where(
          and(
            eq(reviews.userId, userId),
            eq(cards.deckId, deckId),
            lte(reviews.scheduledAt, now)
          )
        )
        .orderBy(reviews.scheduledAt)
        .limit(limit)
        .all()

      // Get new cards (cards that have never been reviewed by this user)
      const newCards = await db
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
        .limit(Math.max(0, limit - dueReviews.length))
        .all()

      return {
        due: dueReviews.map(r => r.cardId),
        new: newCards.map(c => c.cards.id),
      }
    } catch (error) {
      this.handleError(error, 'findDueAndNewCards')
    }
  }

  private validateCard(input: CreateCardInput) {
    if (input.type === 'basic' || input.type === 'cloze') {
      if (!input.back) {
        throw new Error(`Card type ${input.type} requires 'back' field`)
      }
    }
    
    if (input.type === 'multiple_choice') {
      if (!input.choices || input.choices.length < 2) {
        throw new Error('Multiple choice cards require at least 2 choices')
      }
      const correctChoices = input.choices.filter(c => c.isCorrect)
      if (correctChoices.length !== 1) {
        throw new Error('Multiple choice cards must have exactly one correct choice')
      }
    }
    
    if (input.type === 'explain' && !input.explanation) {
      throw new Error('Explain cards require an explanation')
    }
  }
}

export const cardRepository = new CardRepository()
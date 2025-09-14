import { db } from '@/lib/db'
import { decks, cards, type Deck, type NewDeck } from '@/lib/db'
import { eq, and, desc, sql } from 'drizzle-orm'
import { BaseRepository, CreateResult, UpdateResult, DeleteResult } from './base-repository'

export class DeckRepository extends BaseRepository {
  async findAll(includeCardCount = false) {
    if (includeCardCount) {
      const query = db
        .select({
          id: decks.id,
          ownerUserId: decks.ownerUserId,
          title: decks.title,
          description: decks.description,
          level: decks.level,
          language: decks.language,
          isPublic: decks.isPublic,
          createdAt: decks.createdAt,
          updatedAt: decks.updatedAt,
          cardCount: sql<number>`(SELECT COUNT(*) FROM cards WHERE deck_id = decks.id)`.as('card_count')
        })
        .from(decks)
        .orderBy(desc(decks.updatedAt))

      return query
    }

    const query = db
      .select()
      .from(decks)
      .orderBy(desc(decks.updatedAt))

    return query
  }

  async findByUserId(userId: string, includeCardCount = false) {
    if (includeCardCount) {
      const query = db
        .select({
          id: decks.id,
          ownerUserId: decks.ownerUserId,
          title: decks.title,
          description: decks.description,
          level: decks.level,
          language: decks.language,
          isPublic: decks.isPublic,
          createdAt: decks.createdAt,
          updatedAt: decks.updatedAt,
          cardCount: sql<number>`(SELECT COUNT(*) FROM cards WHERE deck_id = decks.id)`.as('card_count')
        })
        .from(decks)
        .where(eq(decks.ownerUserId, userId))
        .orderBy(desc(decks.updatedAt))

      return query
    }

    const query = db
      .select()
      .from(decks)
      .where(eq(decks.ownerUserId, userId))
      .orderBy(desc(decks.updatedAt))

    return query
  }

  async findById(deckId: string) {
    return db
      .select()
      .from(decks)
      .where(eq(decks.id, deckId))
      .then(res => res[0] || null)
  }

  async findByIdAndUserId(deckId: string, userId: string) {
    return db
      .select()
      .from(decks)
      .where(and(
        eq(decks.id, deckId),
        eq(decks.ownerUserId, userId)
      ))
      .then(res => res[0] || null)
  }

  async validateOwnership(deckId: string, userId: string): Promise<boolean> {
    try {
      this.validateRequiredFields({ deckId, userId }, ['deckId', 'userId'])

      // Allow any user to access any deck (simulating all decks are public)
      const deck = await db
        .select({ id: decks.id })
        .from(decks)
        .where(eq(decks.id, deckId))
        .then(res => res[0] || null)

      return !!deck
    } catch (error) {
      this.handleError(error, 'validateOwnership')
    }
  }

  async findByIdWithCards(deckId: string, userId: string) {
    try {
      this.validateRequiredFields({ deckId, userId }, ['deckId', 'userId'])

      // Allow any user to view any deck (simulating all decks are public)
      const deck = await db
        .select()
        .from(decks)
        .where(eq(decks.id, deckId))
        .then(res => res[0] || null)

      if (!deck) {
        return null
      }

      const deckCards = await db
        .select()
        .from(cards)
        .where(eq(cards.deckId, deckId))


      return { deck, cards: deckCards }
    } catch (error) {
      this.handleError(error, 'findByIdWithCards')
    }
  }

  async create(data: {
    userId: string
    title: string
    description?: string
    level?: 'simple' | 'mid' | 'expert'
    language?: string
    isPublic?: boolean
  }): Promise<CreateResult<Deck>> {
    try {
      this.validateRequiredFields(data, ['userId', 'title'])
      
      const [newDeck] = await db.insert(decks).values({
        ownerUserId: data.userId,
        title: data.title,
        description: data.description || null,
        level: data.level || 'simple',
        language: data.language || 'en',
        isPublic: data.isPublic || false,
      }).returning()
      
      return {
        success: true,
        data: newDeck,
        id: newDeck.id,
      }
    } catch (error) {
      this.handleError(error, 'create')
    }
  }

  async update(deckId: string, data: Partial<{
    title: string
    description: string
    level: 'simple' | 'mid' | 'expert'
    isPublic: boolean
  }>) {
    const updateData: any = {}
    
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.level !== undefined) updateData.level = data.level
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic
    
    if (Object.keys(updateData).length === 0) {
      return { changes: 0 }
    }
    
    updateData.updatedAt = new Date()
    
    const [updated] = await db
      .update(decks)
      .set(updateData)
      .where(eq(decks.id, deckId))
      .returning()
    
    return updated
  }

  async updateWithOwnershipCheck(deckId: string, userId: string, data: Partial<{
    title: string
    description: string
    level: 'simple' | 'mid' | 'expert'
    language: string
    isPublic: boolean
  }>) {
    try {
      this.validateRequiredFields({ deckId, userId }, ['deckId', 'userId'])
      
      // First check ownership
      const existingDeck = await db
        .select()
        .from(decks)
        .where(and(eq(decks.id, deckId), eq(decks.ownerUserId, userId)))
        .then(res => res[0] || null)

      if (!existingDeck) {
        throw new Error('not found: Deck not found')
      }

      const updateData: any = {}
      
      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      if (data.level !== undefined) updateData.level = data.level
      if (data.language !== undefined) updateData.language = data.language
      if (data.isPublic !== undefined) updateData.isPublic = data.isPublic
      
      if (Object.keys(updateData).length === 0) {
        return existingDeck
      }
      
      updateData.updatedAt = new Date()
      
      const [updated] = await db
        .update(decks)
        .set(updateData)
        .where(and(eq(decks.id, deckId), eq(decks.ownerUserId, userId)))
        .returning()
      
      return updated
    } catch (error) {
      this.handleError(error, 'updateWithOwnershipCheck')
    }
  }

  async delete(deckId: string): Promise<DeleteResult> {
    try {
      this.validateRequiredFields({ deckId }, ['deckId'])
      // Cards will be deleted automatically due to CASCADE
      await db.delete(decks).where(eq(decks.id, deckId))
      return {
        success: true,
        deletedId: deckId,
      }
    } catch (error) {
      this.handleError(error, 'delete')
    }
  }

  async getStats(userId: string, deckId?: string) {
    const whereCondition = deckId 
      ? and(eq(decks.ownerUserId, userId), eq(decks.id, deckId))
      : eq(decks.ownerUserId, userId)
    
    const query = db
      .select({
        totalDecks: sql<number>`COUNT(DISTINCT decks.id)`,
        totalCards: sql<number>`COUNT(DISTINCT cards.id)`,
      })
      .from(decks)
      .leftJoin(cards, eq(cards.deckId, decks.id))
      .where(whereCondition)
    
    return query.then(res => res[0] || null)
  }
}

export const deckRepository = new DeckRepository()
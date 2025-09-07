import { db, decks, cards, Deck, NewDeck } from '@/lib/db'
import { eq, and, desc, sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export class DeckRepository {
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
      
      return query.all()
    }
    
    const query = db
      .select()
      .from(decks)
      .where(eq(decks.ownerUserId, userId))
      .orderBy(desc(decks.updatedAt))
    
    return query.all()
  }

  async findById(deckId: string) {
    return db
      .select()
      .from(decks)
      .where(eq(decks.id, deckId))
      .get()
  }

  async findByIdAndUserId(deckId: string, userId: string) {
    return db
      .select()
      .from(decks)
      .where(and(
        eq(decks.id, deckId),
        eq(decks.ownerUserId, userId)
      ))
      .get()
  }

  async create(data: {
    userId: string
    title: string
    description?: string
    level?: 'simple' | 'mid' | 'expert'
    language?: string
    isPublic?: boolean
  }) {
    const deckId = randomUUID()
    
    const [newDeck] = await db.insert(decks).values({
      id: deckId,
      ownerUserId: data.userId,
      title: data.title,
      description: data.description || null,
      level: data.level || 'simple',
      language: data.language || 'en',
      isPublic: data.isPublic || false,
    }).returning()
    
    return newDeck
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

  async delete(deckId: string) {
    // Cards will be deleted automatically due to CASCADE
    await db.delete(decks).where(eq(decks.id, deckId))
    return { success: true }
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
    
    return query.get()
  }
}

export const deckRepository = new DeckRepository()
import { db } from '@/lib/db'
import { deckEmbeddings, decks, cards } from '@/lib/db'
import type { DeckEmbedding, NewDeckEmbedding } from '@/lib/db'
import { eq, ne, and } from 'drizzle-orm'
import { BaseRepository } from './base-repository'

export interface SimilarDeckResult {
  id: string
  title: string
  description: string | null
  level: 'simple' | 'mid' | 'expert'
  language: string
  isPublic: boolean
  similarity: number
}

export class DeckEmbeddingRepository extends BaseRepository {
  async findByDeckId(deckId: string): Promise<DeckEmbedding | null> {
    try {
      this.validateRequiredFields({ deckId }, ['deckId'])
      
      const embedding = await db
        .select()
        .from(deckEmbeddings)
        .where(eq(deckEmbeddings.deckId, deckId))
        .then(res => res[0] || null)
      
      return embedding || null
    } catch (error) {
      this.handleError(error, 'findByDeckId')
    }
  }

  async upsertEmbedding(deckId: string, vector: number[], model: string): Promise<void> {
    try {
      this.validateRequiredFields({ deckId, vector, model }, ['deckId', 'vector', 'model'])

      const existing = await this.findByDeckId(deckId)

      if (existing) {
        await db
          .update(deckEmbeddings)
          .set({
            vector,
            dim: vector.length,
            model,
            updatedAt: new Date(),
          })
          .where(eq(deckEmbeddings.id, existing.id))
      } else {
        await db
          .insert(deckEmbeddings)
          .values({
            deckId,
            vector,
            dim: vector.length,
            model,
          })
      }
    } catch (error) {
      this.handleError(error, 'upsertEmbedding')
    }
  }

  async findSimilarDecks(deckId: string, currentVector: number[], limit = 5): Promise<SimilarDeckResult[]> {
    try {
      this.validateRequiredFields({ deckId, currentVector }, ['deckId', 'currentVector'])
      
      // Get all other public deck embeddings
      const allEmbeddings = await db
        .select({
          deckId: deckEmbeddings.deckId,
          vector: deckEmbeddings.vector,
          deck: decks,
        })
        .from(deckEmbeddings)
        .innerJoin(decks, eq(deckEmbeddings.deckId, decks.id))
        .where(
          and(
            ne(deckEmbeddings.deckId, deckId),
            eq(decks.isPublic, true)
          )
        )
        
      
      // Calculate similarities
      const similarities = allEmbeddings.map(item => {
        const vector = item.vector as number[]
        const similarity = this.cosineSimilarity(currentVector, vector)
        return {
          id: item.deck.id,
          title: item.deck.title,
          description: item.deck.description,
          level: item.deck.level as 'simple' | 'mid' | 'expert',
          language: item.deck.language,
          isPublic: item.deck.isPublic,
          similarity,
        }
      })
      
      // Sort by similarity and return top N
      similarities.sort((a, b) => b.similarity - a.similarity)
      
      return similarities.slice(0, limit)
    } catch (error) {
      this.handleError(error, 'findSimilarDecks')
    }
  }

  async getDeckContentForEmbedding(deckId: string): Promise<string> {
    try {
      this.validateRequiredFields({ deckId }, ['deckId'])
      
      // Get deck info
      const deck = await db
        .select()
        .from(decks)
        .where(eq(decks.id, deckId))
        .then(res => res[0] || null)
      
      if (!deck) return ''
      
      // Get sample cards (first 10)
      const sampleCards = await db
        .select()
        .from(cards)
        .where(eq(cards.deckId, deckId))
        .limit(10)
        
      
      // Combine text for embedding
      const combinedText = [
        deck.title,
        deck.description || '',
        ...sampleCards.map(c => `${c.front} ${c.back || ''}`)
      ].join(' ')
      
      return combinedText
    } catch (error) {
      this.handleError(error, 'getDeckContentForEmbedding')
    }
  }

  async findAllPublicDecks(): Promise<{ id: string; title: string }[]> {
    try {
      const publicDecks = await db
        .select({
          id: decks.id,
          title: decks.title,
        })
        .from(decks)
        .where(eq(decks.isPublic, true))
        
      
      return publicDecks
    } catch (error) {
      this.handleError(error, 'findAllPublicDecks')
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0
    
    let dotProduct = 0
    let normA = 0
    let normB = 0
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB)
    return denominator === 0 ? 0 : dotProduct / denominator
  }
}

export const deckEmbeddingRepository = new DeckEmbeddingRepository()
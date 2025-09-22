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

  async upsertEmbedding(deckId: string, vector: number[], model: string, contentHash: string): Promise<void> {
    try {
      this.validateRequiredFields({ deckId, vector, model, contentHash }, ['deckId', 'vector', 'model', 'contentHash'])

      const existing = await this.findByDeckId(deckId)

      if (existing) {
        await db
          .update(deckEmbeddings)
          .set({
            vector,
            dim: vector.length,
            model,
            contentHash,
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
            contentHash,
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

  async getDeckContentForEmbedding(deckId: string): Promise<{ content: string; hash: string }> {
    try {
      this.validateRequiredFields({ deckId }, ['deckId'])

      // Get deck info
      const deck = await db
        .select()
        .from(decks)
        .where(eq(decks.id, deckId))
        .then(res => res[0] || null)

      if (!deck) return { content: '', hash: '' }

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

      // Generate hash of content
      const hash = await this.generateContentHash(combinedText)

      return { content: combinedText, hash }
    } catch (error) {
      this.handleError(error, 'getDeckContentForEmbedding')
    }
  }

  private async generateContentHash(content: string): Promise<string> {
    // Use Web Crypto API to generate SHA-256 hash
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
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

  /**
   * Check if embedding needs to be regenerated based on content hash
   */
  async needsEmbeddingUpdate(deckId: string): Promise<boolean> {
    try {
      const existing = await this.findByDeckId(deckId)
      if (!existing) return true // No embedding exists

      const { hash } = await this.getDeckContentForEmbedding(deckId)
      return existing.contentHash !== hash // Content has changed
    } catch (error) {
      this.handleError(error, 'needsEmbeddingUpdate')
      return true // On error, regenerate to be safe
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
import { db, deckEmbeddings, decks, cards } from '@/lib/db'
import { eq, sql, and, ne, desc } from 'drizzle-orm'

/**
 * Simple text embedding using TF-IDF-like approach
 * In production, use OpenAI embeddings or similar
 */
export function generateEmbedding(text: string): number[] {
  // Normalize and tokenize
  const tokens = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2)
  
  // Create a simple bag-of-words vector (mock embedding)
  // In production, use actual embedding model
  const dimension = 384 // Standard small embedding size
  const embedding = new Array(dimension).fill(0)
  
  // Hash tokens to positions
  tokens.forEach(token => {
    const hash = simpleHash(token)
    const positions = [
      hash % dimension,
      (hash * 2) % dimension,
      (hash * 3) % dimension
    ]
    positions.forEach(pos => {
      embedding[pos] += 1 / Math.sqrt(tokens.length)
    })
  })
  
  // Normalize
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
  if (norm > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= norm
    }
  }
  
  return embedding
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
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

/**
 * Generate and store embedding for a deck
 */
export async function generateDeckEmbedding(deckId: string) {
  // Get deck info
  const deck = await db
    .select()
    .from(decks)
    .where(eq(decks.id, deckId))
    .get()
  
  if (!deck) return null
  
  // Get sample cards (first 10)
  const sampleCards = await db
    .select()
    .from(cards)
    .where(eq(cards.deckId, deckId))
    .limit(10)
    .all()
  
  // Combine text for embedding
  const combinedText = [
    deck.title,
    deck.description || '',
    ...sampleCards.map(c => `${c.front} ${c.back || ''}`)
  ].join(' ')
  
  // Generate embedding
  const vector = generateEmbedding(combinedText)
  
  // Store or update embedding
  const existing = await db
    .select()
    .from(deckEmbeddings)
    .where(eq(deckEmbeddings.deckId, deckId))
    .get()
  
  if (existing) {
    await db
      .update(deckEmbeddings)
      .set({
        vector: JSON.stringify(vector),
        dim: vector.length,
        model: 'simple-tfidf',
        updatedAt: new Date(),
      })
      .where(eq(deckEmbeddings.id, existing.id))
  } else {
    await db
      .insert(deckEmbeddings)
      .values({
        deckId,
        vector: JSON.stringify(vector),
        dim: vector.length,
        model: 'simple-tfidf',
      })
  }
  
  return vector
}

/**
 * Find similar decks using cosine similarity
 */
export async function findSimilarDecks(deckId: string, limit = 5) {
  // Get current deck embedding
  const currentEmbedding = await db
    .select()
    .from(deckEmbeddings)
    .where(eq(deckEmbeddings.deckId, deckId))
    .get()
  
  if (!currentEmbedding) {
    // Generate embedding if it doesn't exist
    await generateDeckEmbedding(deckId)
    return []
  }
  
  const currentVector = JSON.parse(currentEmbedding.vector as string) as number[]
  
  // Get all other deck embeddings
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
    .all()
  
  // Calculate similarities
  const similarities = allEmbeddings.map(item => {
    const vector = JSON.parse(item.vector as string) as number[]
    const similarity = cosineSimilarity(currentVector, vector)
    return {
      deckId: item.deckId,
      deck: item.deck,
      similarity,
    }
  })
  
  // Sort by similarity and return top N
  similarities.sort((a, b) => b.similarity - a.similarity)
  
  return similarities.slice(0, limit).map(item => ({
    ...item.deck,
    similarity: item.similarity,
  }))
}

/**
 * Generate embeddings for all public decks (batch job)
 */
export async function generateAllEmbeddings() {
  const publicDecks = await db
    .select()
    .from(decks)
    .where(eq(decks.isPublic, true))
    .all()
  
  for (const deck of publicDecks) {
    await generateDeckEmbedding(deck.id)
  }
  
  return publicDecks.length
}
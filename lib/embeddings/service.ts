import { deckEmbeddingRepository } from '@/lib/repositories/deck-embedding-repository'

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
  // Get deck content for embedding
  const combinedText = await deckEmbeddingRepository.getDeckContentForEmbedding(deckId)
  
  if (!combinedText) return null
  
  // Generate embedding
  const vector = generateEmbedding(combinedText)
  
  // Store or update embedding
  await deckEmbeddingRepository.upsertEmbedding(deckId, vector, 'simple-tfidf')
  
  return vector
}

/**
 * Find similar decks using cosine similarity
 */
export async function findSimilarDecks(deckId: string, limit = 5) {
  // Get current deck embedding
  const currentEmbedding = await deckEmbeddingRepository.findByDeckId(deckId)
  
  if (!currentEmbedding) {
    // Generate embedding if it doesn't exist
    await generateDeckEmbedding(deckId)
    return []
  }
  
  const currentVector = currentEmbedding.vector as number[]
  
  return await deckEmbeddingRepository.findSimilarDecks(deckId, currentVector, limit)
}

/**
 * Generate embeddings for all public decks (batch job)
 */
export async function generateAllEmbeddings() {
  const publicDecks = await deckEmbeddingRepository.findAllPublicDecks()
  
  for (const deck of publicDecks) {
    await generateDeckEmbedding(deck.id)
  }
  
  return publicDecks.length
}
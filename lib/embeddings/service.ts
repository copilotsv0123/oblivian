import { getConfig } from '@/lib/config/env'
import { deckEmbeddingRepository } from '@/lib/repositories/deck-embedding-repository'

type EmbeddingProvider = 'openai'

interface EmbeddingComputation {
  vector: number[]
  model: string
  provider: EmbeddingProvider
}

const TARGET_VECTOR_DIMENSION = 1536
const DEFAULT_OPENAI_MODEL = 'text-embedding-3-small'
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/embeddings'

/**
 * Generate an embedding vector for the given text using OpenAI's embedding API.
 * Requires a valid OpenAI API key.
 */
export async function generateEmbedding(text: string): Promise<EmbeddingComputation> {
  const normalizedText = text.trim()
  const config = getConfig()

  if (normalizedText.length === 0) {
    throw new Error('Cannot generate embedding for empty text')
  }

  if (!config.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is required for embedding generation')
  }

  const model = config.OPENAI_EMBEDDING_MODEL || DEFAULT_OPENAI_MODEL
  const vector = await createOpenAIEmbedding(normalizedText, model, config.OPENAI_API_KEY)
  return { vector, model: `openai:${model}`, provider: 'openai' }
}


async function createOpenAIEmbedding(text: string, model: string, apiKey: string): Promise<number[]> {
  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: text,
      model,
    }),
  })

  if (!response.ok) {
    const errorBody = await safeReadError(response)
    throw new Error(`OpenAI embeddings request failed: ${errorBody}`)
  }

  const data = await response.json() as { data?: Array<{ embedding: unknown }> }
  const embedding = data.data?.[0]?.embedding

  if (!embedding) {
    throw new Error('OpenAI embeddings response missing embedding vector')
  }

  return ensureVectorSize(sanitizeEmbedding(embedding))
}


function sanitizeEmbedding(embedding: unknown): number[] {
  if (!Array.isArray(embedding)) {
    throw new Error('Embedding vector must be an array')
  }

  return embedding.map((value, index) => {
    const numeric = typeof value === 'number' ? value : Number(value)

    if (!Number.isFinite(numeric)) {
      throw new Error(`Embedding value at index ${index} is not a finite number`)
    }

    return numeric
  })
}

function ensureVectorSize(vector: number[]): number[] {
  if (vector.length === TARGET_VECTOR_DIMENSION) {
    return vector
  }

  if (vector.length > TARGET_VECTOR_DIMENSION) {
    console.warn(`Embedding vector larger than expected (${vector.length}). Truncating to ${TARGET_VECTOR_DIMENSION}.`)
    return vector.slice(0, TARGET_VECTOR_DIMENSION)
  }

  console.warn(`Embedding vector smaller than expected (${vector.length}). Padding to ${TARGET_VECTOR_DIMENSION}.`)
  return vector.concat(new Array(TARGET_VECTOR_DIMENSION - vector.length).fill(0))
}

function logProviderError(provider: EmbeddingProvider, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[Embeddings] ${provider} provider failed: ${message}`)
}

async function safeReadError(response: Response): Promise<string> {
  try {
    const text = await response.text()
    return text || `${response.status} ${response.statusText}`
  } catch {
    return `${response.status} ${response.statusText}`
  }
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
  const combinedText = await deckEmbeddingRepository.getDeckContentForEmbedding(deckId)

  if (!combinedText) return null

  const { vector, model } = await generateEmbedding(combinedText)

  await deckEmbeddingRepository.upsertEmbedding(deckId, vector, model)

  return vector
}

/**
 * Find similar decks using cosine similarity
 */
export async function findSimilarDecks(deckId: string, limit = 5) {
  const currentEmbedding = await deckEmbeddingRepository.findByDeckId(deckId)

  if (!currentEmbedding) {
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

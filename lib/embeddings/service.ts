import { getConfig } from '@/lib/config/env'
import { deckEmbeddingRepository } from '@/lib/repositories/deck-embedding-repository'

type EmbeddingProvider = 'openai' | 'anthropic' | 'local'

interface EmbeddingComputation {
  vector: number[]
  model: string
  provider: EmbeddingProvider
}

const TARGET_VECTOR_DIMENSION = 1536
const DEFAULT_OPENAI_MODEL = 'text-embedding-3-small'
const ANTHROPIC_API_VERSION = process.env.ANTHROPIC_API_VERSION || '2023-06-01'
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/embeddings'
const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/embeddings'

/**
 * Generate an embedding vector for the given text using the configured provider.
 * Falls back to a deterministic local embedding when external APIs are unavailable.
 */
export async function generateEmbedding(text: string): Promise<EmbeddingComputation> {
  const normalizedText = text.trim()
  const config = getConfig()
  const provider = chooseProvider(config)

  if (normalizedText.length === 0) {
    return {
      vector: new Array(TARGET_VECTOR_DIMENSION).fill(0),
      model: 'local:empty',
      provider: 'local',
    }
  }

  if (provider === 'openai' && config.OPENAI_API_KEY) {
    const model = config.OPENAI_EMBEDDING_MODEL || DEFAULT_OPENAI_MODEL

    try {
      const vector = await createOpenAIEmbedding(normalizedText, model, config.OPENAI_API_KEY)
      return { vector, model: `openai:${model}`, provider }
    } catch (error) {
      logProviderError('openai', error)
    }
  }

  if (provider === 'anthropic' && config.ANTHROPIC_API_KEY) {
    const model = config.ANTHROPIC_EMBEDDING_MODEL

    if (!model) {
      console.warn('[Embeddings] ANTHROPIC_EMBEDDING_MODEL is not set. Falling back to local embeddings.')
    } else {
      try {
        const vector = await createAnthropicEmbedding(normalizedText, model, config.ANTHROPIC_API_KEY)
        return { vector, model: `anthropic:${model}`, provider }
      } catch (error) {
        logProviderError('anthropic', error)
      }
    }
  }

  const vector = createLocalEmbeddingVector(normalizedText)
  return { vector, model: 'local:simple-tfidf', provider: 'local' }
}

function chooseProvider(config: ReturnType<typeof getConfig>): EmbeddingProvider {
  const hasOpenAI = Boolean(config.OPENAI_API_KEY)
  const hasAnthropic = Boolean(config.ANTHROPIC_API_KEY)
  const preferred = config.EMBEDDING_PROVIDER

  if (preferred === 'openai') {
    return hasOpenAI ? 'openai' : 'local'
  }

  if (preferred === 'anthropic') {
    return hasAnthropic ? 'anthropic' : 'local'
  }

  if (preferred === 'local') {
    return 'local'
  }

  if (hasOpenAI) return 'openai'
  if (hasAnthropic) return 'anthropic'
  return 'local'
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

async function createAnthropicEmbedding(text: string, model: string, apiKey: string): Promise<number[]> {
  const response = await fetch(ANTHROPIC_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_API_VERSION,
    },
    body: JSON.stringify({
      input: text,
      model,
    }),
  })

  if (!response.ok) {
    const errorBody = await safeReadError(response)
    throw new Error(`Anthropic embeddings request failed: ${errorBody}`)
  }

  const data = await response.json() as { embedding?: unknown; data?: Array<{ embedding: unknown }> }
  const embedding = data.embedding ?? data.data?.[0]?.embedding

  if (!embedding) {
    throw new Error('Anthropic embeddings response missing embedding vector')
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

function createLocalEmbeddingVector(text: string): number[] {
  const tokens = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2)

  const embedding = new Array(TARGET_VECTOR_DIMENSION).fill(0)

  tokens.forEach(token => {
    const hash = simpleHash(token)
    const positions = [
      hash % TARGET_VECTOR_DIMENSION,
      (hash * 2) % TARGET_VECTOR_DIMENSION,
      (hash * 3) % TARGET_VECTOR_DIMENSION,
    ]

    positions.forEach(pos => {
      embedding[pos] += 1 / Math.sqrt(tokens.length)
    })
  })

  const norm = Math.sqrt(embedding.reduce((sum, value) => sum + value * value, 0))

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
    hash = hash & hash
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

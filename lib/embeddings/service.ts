import { getConfig } from "@/lib/config/env";
import { deckEmbeddingRepository } from "@/lib/repositories/deck-embedding-repository";

type EmbeddingProvider = "gemini";

interface EmbeddingComputation {
  vector: number[];
  model: string;
  provider: EmbeddingProvider;
}

const TARGET_VECTOR_DIMENSION = 1536;
const GEMINI_VECTOR_DIMENSION = 768;
const DEFAULT_GEMINI_MODEL = "text-embedding-004";
const GEMINI_EMBED_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Generate an embedding vector for the given text using Gemini embedding API.
 * Requires a valid Gemini API key.
 */
export async function generateEmbedding(
  text: string,
): Promise<EmbeddingComputation> {
  const normalizedText = text.trim();
  const config = getConfig();

  if (normalizedText.length === 0) {
    throw new Error("Cannot generate embedding for empty text");
  }

  if (!config.GEMINI_API_KEY) {
    throw new Error("Gemini API key is required for embedding generation");
  }

  const model = config.GEMINI_EMBEDDING_MODEL || DEFAULT_GEMINI_MODEL;
  const vector = await createGeminiEmbedding(
    normalizedText,
    model,
    config.GEMINI_API_KEY,
  );
  return { vector, model: `gemini:${model}`, provider: "gemini" };
}

async function createGeminiEmbedding(
  text: string,
  model: string,
  apiKey: string,
): Promise<number[]> {
  const url = `${GEMINI_EMBED_ENDPOINT}/${model}:embedContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: `models/${model}`,
      content: {
        parts: [{ text }],
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await safeReadError(response);
    throw new Error(`Gemini embeddings request failed: ${errorBody}`);
  }

  const data = (await response.json()) as {
    embedding?: { value?: unknown; values?: unknown };
  };
  const embedding = data.embedding?.values ?? data.embedding?.value;

  if (!embedding) {
    throw new Error("Gemini embeddings response missing embedding vector");
  }

  return ensureVectorSize(sanitizeEmbedding(embedding));
}

function sanitizeEmbedding(embedding: unknown): number[] {
  if (!Array.isArray(embedding)) {
    throw new Error("Embedding vector must be an array");
  }

  return embedding.map((value, index) => {
    const numeric = typeof value === "number" ? value : Number(value);

    if (!Number.isFinite(numeric)) {
      throw new Error(
        `Embedding value at index ${index} is not a finite number`,
      );
    }

    return numeric;
  });
}

function ensureVectorSize(vector: number[]): number[] {
  if (vector.length === TARGET_VECTOR_DIMENSION) {
    return vector;
  }

  if (vector.length === GEMINI_VECTOR_DIMENSION) {
    if (TARGET_VECTOR_DIMENSION > GEMINI_VECTOR_DIMENSION) {
      return vector.concat(
        new Array(TARGET_VECTOR_DIMENSION - GEMINI_VECTOR_DIMENSION).fill(0),
      );
    }

    return vector.slice(0, TARGET_VECTOR_DIMENSION);
  }

  if (vector.length > TARGET_VECTOR_DIMENSION) {
    console.warn(
      `Embedding vector larger than expected (${vector.length}). Truncating to ${TARGET_VECTOR_DIMENSION}.`,
    );
    return vector.slice(0, TARGET_VECTOR_DIMENSION);
  }

  console.warn(
    `Embedding vector smaller than expected (${vector.length}). Padding to ${TARGET_VECTOR_DIMENSION}.`,
  );
  return vector.concat(
    new Array(TARGET_VECTOR_DIMENSION - vector.length).fill(0),
  );
}

async function safeReadError(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text || `${response.status} ${response.statusText}`;
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Generate and store embedding for a deck
 */
export async function generateDeckEmbedding(deckId: string) {
  // Check if embedding needs to be updated
  if (!(await deckEmbeddingRepository.needsEmbeddingUpdate(deckId))) {
    const existing = await deckEmbeddingRepository.findByDeckId(deckId);
    return (existing?.vector as number[]) || null;
  }

  const { content, hash } =
    await deckEmbeddingRepository.getDeckContentForEmbedding(deckId);

  if (!content) return null;

  const { vector, model } = await generateEmbedding(content);

  await deckEmbeddingRepository.upsertEmbedding(deckId, vector, model, hash);

  return vector;
}

/**
 * Find similar decks using cosine similarity
 */
export async function findSimilarDecks(deckId: string, limit = 5) {
  const currentEmbedding = await deckEmbeddingRepository.findByDeckId(deckId);

  if (!currentEmbedding) {
    await generateDeckEmbedding(deckId);
    return [];
  }

  const currentVector = currentEmbedding.vector as number[];

  return await deckEmbeddingRepository.findSimilarDecks(
    deckId,
    currentVector,
    limit,
  );
}

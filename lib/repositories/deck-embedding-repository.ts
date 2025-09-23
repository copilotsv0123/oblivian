import { db } from "@/lib/db";
import { deckEmbeddings, decks, cards } from "@/lib/db";
import type { DeckEmbedding, NewDeckEmbedding } from "@/lib/db";
import { eq, ne, and } from "drizzle-orm";
import { BaseRepository } from "./base-repository";

export interface SimilarDeckResult {
  id: string;
  title: string;
  description: string | null;
  level: "simple" | "mid" | "expert";
  language: string;
  isPublic: boolean;
  similarity: number;
}

export class DeckEmbeddingRepository extends BaseRepository {
  async findByDeckId(deckId: string): Promise<DeckEmbedding | null> {
    try {
      this.validateRequiredFields({ deckId }, ["deckId"]);

      const embedding = await db
        .select()
        .from(deckEmbeddings)
        .where(eq(deckEmbeddings.deckId, deckId))
        .then((res) => res[0] || null);

      return embedding || null;
    } catch (error) {
      this.handleError(error, "findByDeckId");
    }
  }

  async upsertEmbedding(
    deckId: string,
    vector: number[],
    model: string,
    contentHash: string,
  ): Promise<void> {
    try {
      this.validateRequiredFields({ deckId, vector, model, contentHash }, [
        "deckId",
        "vector",
        "model",
        "contentHash",
      ]);

      const existing = await this.findByDeckId(deckId);

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
          .where(eq(deckEmbeddings.id, existing.id));
      } else {
        await db.insert(deckEmbeddings).values({
          deckId,
          vector,
          dim: vector.length,
          model,
          contentHash,
        });
      }
    } catch (error) {
      this.handleError(error, "upsertEmbedding");
    }
  }

  async findSimilarDecks(
    deckId: string,
    currentVector: number[],
    limit = 5,
  ): Promise<SimilarDeckResult[]> {
    try {
      this.validateRequiredFields({ deckId, currentVector }, [
        "deckId",
        "currentVector",
      ]);

      // Minimum similarity threshold (40% similarity)
      const MIN_SIMILARITY = 0.4;

      // Get all other public deck embeddings
      const allEmbeddings = await db
        .select({
          deckId: deckEmbeddings.deckId,
          vector: deckEmbeddings.vector,
          deck: decks,
        })
        .from(deckEmbeddings)
        .innerJoin(decks, eq(deckEmbeddings.deckId, decks.id))
        .where(and(ne(deckEmbeddings.deckId, deckId)));

      // Get current deck info for language preference
      const currentDeck = await db
        .select()
        .from(decks)
        .where(eq(decks.id, deckId))
        .then((res) => res[0] || null);

      // Calculate similarities and filter by threshold
      const similarities = allEmbeddings
        .map((item) => {
          const vector = item.vector as number[];
          let similarity = this.cosineSimilarity(currentVector, vector);

          // Boost similarity for same language (10% bonus)
          if (currentDeck && item.deck.language === currentDeck.language) {
            similarity = Math.min(1.0, similarity * 1.1);
          }

          return {
            id: item.deck.id,
            title: item.deck.title,
            description: item.deck.description,
            level: item.deck.level as "simple" | "mid" | "expert",
            language: item.deck.language,
            isPublic: item.deck.isPublic,
            similarity,
          };
        })
        .filter((item) => item.similarity >= MIN_SIMILARITY); // Only include decks with meaningful similarity

      // Sort by similarity and return top N
      similarities.sort((a, b) => b.similarity - a.similarity);

      return similarities.slice(0, limit);
    } catch (error) {
      this.handleError(error, "findSimilarDecks");
    }
  }

  async getDeckContentForEmbedding(
    deckId: string,
  ): Promise<{ content: string; hash: string }> {
    try {
      this.validateRequiredFields({ deckId }, ["deckId"]);

      // Get deck info
      const deck = await db
        .select()
        .from(decks)
        .where(eq(decks.id, deckId))
        .then((res) => res[0] || null);

      if (!deck) return { content: "", hash: "" };

      // Get all cards to calculate total count
      const totalCards = await db
        .select()
        .from(cards)
        .where(eq(cards.deckId, deckId));

      // Use more representative sampling:
      // - For small decks (≤20 cards): use all cards
      // - For larger decks: use every Nth card to get a good distribution
      let sampleCards = totalCards;
      if (totalCards.length > 20) {
        const step = Math.ceil(totalCards.length / 15); // Take every Nth card to get ~15 samples
        sampleCards = totalCards.filter((_, index) => index % step === 0);
      }

      // Combine text for embedding with better weighting
      const combinedText = [
        // Title and description are more important, so repeat them
        deck.title,
        deck.title, // Repeat title for emphasis
        deck.description || "",
        deck.description || "", // Repeat description for emphasis
        ...sampleCards.map((c) => {
          const parts = [c.front, c.back || ""];
          if (c.advancedNotes) parts.push(c.advancedNotes);
          return parts.join(" ");
        }),
      ]
        .filter((text) => text.trim().length > 0)
        .join(" ");

      // Generate hash of content
      const hash = await this.generateContentHash(combinedText);

      return { content: combinedText, hash };
    } catch (error) {
      this.handleError(error, "getDeckContentForEmbedding");
    }
  }

  private async generateContentHash(content: string): Promise<string> {
    // Use Web Crypto API to generate SHA-256 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex;
  }

  /**
   * Check if embedding needs to be regenerated based on content hash
   */
  async needsEmbeddingUpdate(deckId: string): Promise<boolean> {
    try {
      const existing = await this.findByDeckId(deckId);
      if (!existing) return true; // No embedding exists

      const { hash } = await this.getDeckContentForEmbedding(deckId);
      return existing.contentHash !== hash; // Content has changed
    } catch (error) {
      this.handleError(error, "needsEmbeddingUpdate");
      return true; // On error, regenerate to be safe
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
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
}

export const deckEmbeddingRepository = new DeckEmbeddingRepository();

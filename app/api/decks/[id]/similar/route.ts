import {
  findSimilarDecks,
  generateDeckEmbedding,
} from "@/lib/embeddings/service";
import { withApiHandler, ApiContext } from "@/lib/middleware/api-wrapper";

export const GET = withApiHandler(
  async ({ user }: ApiContext, routeContext: any) => {
    const { params } = routeContext as { params: Promise<{ id: string }> };
    const { id: deckId } = await params;

    await generateDeckEmbedding(deckId);

    // Find similar decks
    const similarDecks = await findSimilarDecks(deckId, 10);

    return {
      decks: similarDecks,
      count: similarDecks.length,
    };
  },
);

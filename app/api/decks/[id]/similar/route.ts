import { findSimilarDecks, generateDeckEmbedding } from '@/lib/embeddings/service'
import { withApiHandler, ApiContext } from '@/lib/middleware/api-wrapper'

export const GET = withApiHandler(async ({ user }: ApiContext, routeContext: any) => {
  const { params } = routeContext as { params: Promise<{ id: string }> }
  const { id: deckId } = await params
  
  // Ensure deck has embedding
  await generateDeckEmbedding(deckId)
  
  // Find similar decks
  const similarDecks = await findSimilarDecks(deckId, 5)
  
  return {
    decks: similarDecks,
    count: similarDecks.length,
  }
})
import { NextRequest, NextResponse } from 'next/server'
import { findSimilarDecks, generateDeckEmbedding } from '@/lib/embeddings/service'
import { authenticateRequest } from '@/lib/auth/middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: deckId } = await params
    
    // Ensure deck has embedding
    await generateDeckEmbedding(deckId)
    
    // Find similar decks
    const similarDecks = await findSimilarDecks(deckId, 5)
    
    return NextResponse.json({
      decks: similarDecks,
      count: similarDecks.length,
    })
  } catch (error) {
    console.error('Error finding similar decks:', error)
    return NextResponse.json(
      { error: 'Failed to find similar decks' },
      { status: 500 }
    )
  }
}
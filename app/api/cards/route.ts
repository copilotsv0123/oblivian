import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth/middleware'
import { CreateCardInput } from '@/lib/types/cards'
import { deckRepository, cardRepository } from '@/lib/repositories'

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const input: CreateCardInput = await request.json()
    const { deckId, type, front, back, choices, explanation } = input

    if (!deckId || !type || !front) {
      return NextResponse.json(
        { error: 'deckId, type, and front are required' },
        { status: 400 }
      )
    }

    // Check if user owns the deck
    const deck = await deckRepository.findByIdAndUserId(deckId, user.id)
    if (!deck) {
      return NextResponse.json(
        { error: 'Deck not found or unauthorized' },
        { status: 404 }
      )
    }

    const result = await cardRepository.create(input)

    return NextResponse.json({ card: result.data })
  } catch (error) {
    console.error('Error creating card:', error)
    return NextResponse.json(
      { error: 'Failed to create card' },
      { status: 500 }
    )
  }
}
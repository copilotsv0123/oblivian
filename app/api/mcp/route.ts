import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/auth/middleware'
import { deckRepository, cardRepository } from '@/lib/repositories'
import { MAX_CARDS_PER_DECK } from '@/lib/constants'

// MCP Protocol Implementation with SSE Transport
const PROTOCOL_VERSION = '2024-11-05'

interface MCPRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: any
}

interface MCPResponse {
  jsonrpc: '2.0'
  id?: string | number
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

// MCP Tools available
const TOOLS = [
  {
    name: 'list_decks',
    description: 'List all flashcard decks',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_deck',
    description: 'Create a new flashcard deck',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the deck' },
        description: { type: 'string', description: 'Description of the deck' },
        level: {
          type: 'string',
          enum: ['simple', 'mid', 'expert'],
          description: 'Difficulty level',
        },
        language: {
          type: 'string',
          description: 'Language of the deck (e.g., en, es, fr, de, it, pt, ru, zh, ja, ko)',
          default: 'en'
        },
        isPublic: {
          type: 'boolean',
          description: 'Whether the deck should be publicly visible',
          default: false
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of tags to categorize the deck (e.g., ["tech", "programming", "algorithms"])',
          default: []
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'create_cards_batch',
    description: 'Create multiple flashcards at once',
    inputSchema: {
      type: 'object',
      properties: {
        deckId: { type: 'string', description: 'ID of the deck' },
        cards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              front: { type: 'string' },
              back: { type: 'string' },
              advancedNotes: { type: 'string', description: 'Advanced notes with deeper insights' },
            },
            required: ['front', 'back', 'advancedNotes'],
          },
        },
      },
      required: ['deckId', 'cards'],
    },
  },
  {
    name: 'list_cards',
    description: 'List cards in a deck',
    inputSchema: {
      type: 'object',
      properties: {
        deckId: { type: 'string', description: 'ID of the deck' },
      },
      required: ['deckId'],
    },
  },
  {
    name: 'delete_card',
    description: 'Delete a flashcard',
    inputSchema: {
      type: 'object',
      properties: {
        cardId: { type: 'string', description: 'ID of the card to delete' },
      },
      required: ['cardId'],
    },
  },
  {
    name: 'delete_cards_batch',
    description: 'Delete multiple flashcards at once',
    inputSchema: {
      type: 'object',
      properties: {
        cardIds: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Array of card IDs to delete' 
        },
      },
      required: ['cardIds'],
    },
  },
  {
    name: 'update_card',
    description: 'Update a flashcard content',
    inputSchema: {
      type: 'object',
      properties: {
        cardId: { type: 'string', description: 'ID of the card to update' },
        front: { type: 'string', description: 'New front content' },
        back: { type: 'string', description: 'New back content' },
        choices: { type: 'string', description: 'New choices for multiple choice cards' },
        explanation: { type: 'string', description: 'New explanation' },
        advancedNotes: { type: 'string', description: 'Advanced notes with deeper insights' },
      },
      required: ['cardId'],
    },
  },
  {
    name: 'update_cards_batch',
    description: 'Update multiple flashcards at once',
    inputSchema: {
      type: 'object',
      properties: {
        cards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              cardId: { type: 'string', description: 'ID of the card to update' },
              front: { type: 'string', description: 'New front content' },
              back: { type: 'string', description: 'New back content' },
              choices: { type: 'string', description: 'New choices for multiple choice cards' },
              explanation: { type: 'string', description: 'New explanation' },
              advancedNotes: { type: 'string', description: 'Advanced notes with deeper insights' },
            },
            required: ['cardId'],
          },
        },
      },
      required: ['cards'],
    },
  },
  {
    name: 'update_deck',
    description: 'Update a flashcard deck properties',
    inputSchema: {
      type: 'object',
      properties: {
        deckId: { type: 'string', description: 'ID of the deck to update' },
        title: { type: 'string', description: 'New title of the deck' },
        description: { type: 'string', description: 'New description of the deck' },
        level: {
          type: 'string',
          enum: ['simple', 'mid', 'expert'],
          description: 'New difficulty level',
        },
        language: {
          type: 'string',
          description: 'New language of the deck (e.g., en, es, fr, de, it, pt, ru, zh, ja, ko)',
        },
        isPublic: {
          type: 'boolean',
          description: 'Whether the deck should be publicly visible',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'New array of tags to categorize the deck (e.g., ["tech", "programming", "algorithms"])',
        },
      },
      required: ['deckId'],
    },
  },
  {
    name: 'delete_deck',
    description: 'Delete a flashcard deck and all its cards',
    inputSchema: {
      type: 'object',
      properties: {
        deckId: { type: 'string', description: 'ID of the deck to delete' },
      },
      required: ['deckId'],
    },
  },
  {
    name: 'get_api_info',
    description: 'Get information about the API connection',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
]

async function handleMCPRequest(request: MCPRequest, userId: string): Promise<MCPResponse> {
  try {
    switch (request.method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'oblivian-mcp',
              version: '1.0.0',
            },
          },
        }

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: TOOLS,
          },
        }

      case 'tools/call':
        const { name, arguments: args } = request.params
        
        switch (name) {
          case 'list_decks':
            const userDecks = await deckRepository.findByUserId(userId, true) // Include card counts
            
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({ decks: userDecks }, null, 2),
                }],
              },
            }

          case 'create_deck':
            const deckResult = await deckRepository.create({
              userId,
              title: args.title,
              description: args.description,
              level: args.level || 'simple',
              language: args.language || 'en',
              isPublic: args.isPublic || false,
              tags: args.tags || [],
            })
            
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({ deck: deckResult.data }, null, 2),
                }],
              },
            }

          case 'create_cards_batch':
            console.log('MCP create_cards_batch called with:', { deckId: args.deckId, userId, cardsCount: args.cards?.length })
            console.log('Cards data:', JSON.stringify(args.cards, null, 2))

            try {
              // Validate required parameters
              if (!args.deckId) {
                throw new Error('deckId is required')
              }
              if (!args.cards || !Array.isArray(args.cards)) {
                throw new Error('cards array is required')
              }
              if (args.cards.length === 0) {
                throw new Error('At least one card is required')
              }

              // Validate each card has required fields
              args.cards.forEach((card: any, index: number) => {
                if (!card.front) {
                  throw new Error(`Card at index ${index}: front field is required`)
                }
                if (!card.back) {
                  throw new Error(`Card at index ${index}: back field is required`)
                }
                if (!card.advancedNotes) {
                  throw new Error(`Card at index ${index}: advancedNotes field is required`)
                }
              })

              // Check card count limit
              const currentCardCount = await cardRepository.countByDeckId(args.deckId)
              const totalAfterImport = currentCardCount + args.cards.length

              if (totalAfterImport > MAX_CARDS_PER_DECK) {
                const remainingSlots = Math.max(0, MAX_CARDS_PER_DECK - currentCardCount)
                throw new Error(`Cannot create ${args.cards.length} cards. Deck currently has ${currentCardCount} cards. Maximum is ${MAX_CARDS_PER_DECK} cards per deck. You can add up to ${remainingSlots} more cards.`)
              }

              // Force all cards to be 'basic' type
              const cardsWithType = args.cards.map((card: any) => ({
                ...card,
                type: 'basic'
              }))

              console.log('Creating cards with validated data:', JSON.stringify(cardsWithType, null, 2))
              const batchResult = await cardRepository.createBatchWithOwnershipCheck(args.deckId, userId, cardsWithType)
              console.log('Batch result:', { success: batchResult.success, count: batchResult.count })

              if (!batchResult.success) {
                throw new Error('Failed to create cards - no success flag returned')
              }

              return {
                jsonrpc: '2.0',
                id: request.id,
                result: {
                  content: [{
                    type: 'text',
                    text: JSON.stringify({
                      created: batchResult.count,
                      cards: batchResult.cards,
                    }, null, 2),
                  }],
                },
              }
            } catch (error) {
              console.error('MCP create_cards_batch error:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                args: { deckId: args.deckId, cardsCount: args.cards?.length },
                userId
              })

              // Return proper MCP error response instead of throwing
              return {
                jsonrpc: '2.0',
                id: request.id,
                error: {
                  code: -32603,
                  message: 'Card creation failed',
                  data: error instanceof Error ? error.message : 'Unknown error',
                },
              }
            }

          case 'list_cards':
            if (!args.deckId) {
              throw new Error('deckId is required for list_cards')
            }

            // Verify deck exists and user has access
            const deckForCards = await deckRepository.findById(args.deckId, userId)
            if (!deckForCards) {
              throw new Error(`Deck not found: ${args.deckId}`)
            }

            const deckCards = await cardRepository.findByDeckId(args.deckId)

            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    deckId: args.deckId,
                    deckTitle: deckForCards.title,
                    cardCount: deckCards.length,
                    cards: deckCards
                  }, null, 2),
                }],
              },
            }

          case 'delete_card':
            const deleteResult = await cardRepository.delete(args.cardId)
            
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({ deleted: deleteResult.success, cardId: args.cardId }, null, 2),
                }],
              },
            }

          case 'delete_cards_batch':
            const batchDeleteResult = await cardRepository.deleteBatchWithOwnershipCheck(args.cardIds, userId)
            
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({ 
                    deleted: batchDeleteResult.success,
                    count: batchDeleteResult.deletedCount,
                    deletedIds: batchDeleteResult.deletedIds,
                    skippedIds: batchDeleteResult.skippedIds,
                    message: batchDeleteResult.message,
                  }, null, 2),
                }],
              },
            }

          case 'update_cards_batch':
            const batchUpdateResult = await cardRepository.updateBatchWithOwnershipCheck(userId, args.cards)

            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    updated: batchUpdateResult.success,
                    count: batchUpdateResult.updatedCount,
                    updatedCards: batchUpdateResult.updatedCards,
                    skippedIds: batchUpdateResult.skippedIds,
                    message: batchUpdateResult.message,
                  }, null, 2),
                }],
              },
            }

          case 'update_card':
            const cardUpdateData: Record<string, any> = {}
            if (args.front !== undefined) cardUpdateData.front = args.front
            if (args.back !== undefined) cardUpdateData.back = args.back
            if (args.choices !== undefined) cardUpdateData.choices = args.choices
            if (args.explanation !== undefined) cardUpdateData.explanation = args.explanation
            if (args.advancedNotes !== undefined) cardUpdateData.advancedNotes = args.advancedNotes

            const updatedCard = await cardRepository.updateWithOwnershipCheck(args.cardId, userId, cardUpdateData)
            
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({ 
                    updated: true,
                    card: updatedCard,
                  }, null, 2),
                }],
              },
            }

          case 'update_deck':
            // First check if user owns the deck
            const deckToUpdate = await deckRepository.findByIdAndUserId(args.deckId, userId)
            if (!deckToUpdate) {
              throw new Error(`Deck with ID ${args.deckId} not found or access denied`)
            }

            // Prepare update data
            const updateData: any = {}
            if (args.title !== undefined) updateData.title = args.title
            if (args.description !== undefined) updateData.description = args.description
            if (args.level !== undefined) updateData.level = args.level
            if (args.language !== undefined) updateData.language = args.language
            if (args.isPublic !== undefined) updateData.isPublic = args.isPublic
            if (args.tags !== undefined) updateData.tags = args.tags
            if (args.autoRevealSeconds !== undefined) updateData.autoRevealSeconds = args.autoRevealSeconds

            const updatedDeck = await deckRepository.updateWithOwnershipCheckWithTags(args.deckId, userId, updateData)

            // Fetch the deck again to get the starred status
            const deckWithStarred = await deckRepository.findById(args.deckId, userId)

            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    updated: true,
                    deckId: args.deckId,
                    deck: deckWithStarred || updatedDeck
                  }, null, 2),
                }],
              },
            }

          case 'delete_deck':
            // First check if user owns the deck
            const deckToDelete = await deckRepository.findByIdAndUserId(args.deckId, userId)
            if (!deckToDelete) {
              throw new Error(`Deck with ID ${args.deckId} not found or access denied`)
            }
            
            const deleteDeckResult = await deckRepository.delete(args.deckId)
            
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({ deleted: deleteDeckResult.success, deckId: args.deckId, title: deckToDelete.title }, null, 2),
                }],
              },
            }

          case 'get_api_info':
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    status: 'connected',
                    userId,
                    serverVersion: '1.0.0',
                  }, null, 2),
                }],
              },
            }

          default:
            return {
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: -32601,
                message: `Unknown tool: ${name}`,
              },
            }
        }

      default:
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32601,
            message: `Method not found: ${request.method}`,
          },
        }
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

export async function GET(request: NextRequest) {
  // Authenticate the request
  const user = await authenticateRequest(request)
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  // Create a TransformStream for SSE
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  const encoder = new TextEncoder()

  // Send initial connection message
  writer.write(encoder.encode('event: open\ndata: {"type":"connection","status":"ready"}\n\n'))

  // Clean up on disconnect
  request.signal.addEventListener('abort', () => {
    writer.close()
  })

  return new Response(stream.readable, { headers })
}

export async function POST(request: NextRequest) {
  // Authenticate the request
  const user = await authenticateRequest(request)
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const mcpRequest: MCPRequest = await request.json()
    const response = await handleMCPRequest(mcpRequest, user.id)
    
    // For POST requests, return the response directly as JSON
    return Response.json(response)
  } catch (error) {
    return Response.json({
      jsonrpc: '2.0',
      error: {
        code: -32700,
        message: 'Parse error',
      },
    }, { status: 400 })
  }
}

// Handle SSE message sending for bidirectional communication
export async function PUT(request: NextRequest) {
  // This endpoint would be used to send messages through an established SSE connection
  // For now, we'll use POST for request-response pattern
  return new Response('Method not implemented', { status: 501 })
}
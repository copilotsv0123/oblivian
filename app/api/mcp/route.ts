import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/auth/middleware'
import { deckRepository, cardRepository } from '@/lib/repositories'

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
              type: {
                type: 'string',
                enum: ['basic', 'cloze', 'multiple_choice', 'explanation'],
              },
              front: { type: 'string' },
              back: { type: 'string' },
              choices: { type: 'string' },
              explanation: { type: 'string' },
            },
            required: ['type', 'front'],
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
      },
      required: ['cardId'],
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
              const batchResult = await cardRepository.createBatchWithOwnershipCheck(args.deckId, userId, args.cards)
              console.log('Batch result:', { success: batchResult.success, count: batchResult.count })
              
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
              console.error('MCP create_cards_batch error:', error)
              throw error
            }

          case 'list_cards':
            const deckCards = await cardRepository.findByDeckId(args.deckId)
            
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({ cards: deckCards }, null, 2),
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

          case 'update_card':
            const cardUpdateData: any = {}
            if (args.front !== undefined) cardUpdateData.front = args.front
            if (args.back !== undefined) cardUpdateData.back = args.back
            if (args.choices !== undefined) cardUpdateData.choices = args.choices
            if (args.explanation !== undefined) cardUpdateData.explanation = args.explanation
            
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
            
            const updatedDeck = await deckRepository.updateWithOwnershipCheck(args.deckId, userId, updateData)
            
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({ 
                    updated: true, 
                    deckId: args.deckId, 
                    deck: updatedDeck 
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
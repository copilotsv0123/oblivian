import { NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/auth/middleware'
import { db } from '@/lib/db'
import { decks, cards, apiTokens } from '@/lib/db/schema'
import { eq, desc, and, sql } from 'drizzle-orm'

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
          enum: ['simple', 'intermediate', 'expert'],
          description: 'Difficulty level',
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
            const userDecks = await db
              .select()
              .from(decks)
              .where(eq(decks.ownerUserId, userId))
              .orderBy(desc(decks.createdAt))
            
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
            const newDeck = await db
              .insert(decks)
              .values({
                ownerUserId: userId,
                title: args.title,
                description: args.description || null,
                level: args.level || 'simple',
              })
              .returning()
            
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({ deck: newDeck[0] }, null, 2),
                }],
              },
            }

          case 'create_cards_batch':
            const createdCards = await db
              .insert(cards)
              .values(
                args.cards.map((card: any) => ({
                  deckId: args.deckId,
                  type: card.type,
                  front: card.front,
                  back: card.back || null,
                  choices: card.choices || null,
                  explanation: card.explanation || null,
                }))
              )
              .returning()
            
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({ 
                    created: createdCards.length,
                    cards: createdCards,
                  }, null, 2),
                }],
              },
            }

          case 'list_cards':
            const deckCards = await db
              .select()
              .from(cards)
              .where(eq(cards.deckId, args.deckId))
            
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
            await db.delete(cards).where(eq(cards.id, args.cardId))
            
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  type: 'text',
                  text: JSON.stringify({ deleted: true, cardId: args.cardId }, null, 2),
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
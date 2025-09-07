#!/usr/bin/env tsx

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { deckRepository } from '../lib/repositories/deck-repository'
import { cardRepository } from '../lib/repositories/card-repository'
import { CreateCardInput } from '../lib/types/cards'
import { validateApiToken } from '../lib/auth/token'

// Create MCP server
const server = new Server(
  {
    name: 'oblivian-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_decks',
        description: 'List all decks for a user',
        inputSchema: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'API token for authentication',
            },
            includeCardCount: {
              type: 'boolean',
              description: 'Include count of cards in each deck',
              default: false,
            },
          },
          required: ['token'],
        },
        outputSchema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            decks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  ownerUserId: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  level: { type: 'string', enum: ['simple', 'mid', 'expert'] },
                  language: { type: 'string' },
                  isPublic: { type: 'boolean' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                  cardCount: { type: 'number' },
                },
              },
            },
          },
        },
      },
      {
        name: 'create_deck',
        description: 'Create a new deck',
        inputSchema: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'API token for authentication',
            },
            title: {
              type: 'string',
              description: 'Title of the deck',
            },
            description: {
              type: 'string',
              description: 'Description of the deck',
            },
            level: {
              type: 'string',
              enum: ['simple', 'mid', 'expert'],
              description: 'Difficulty level of the deck',
              default: 'simple',
            },
            language: {
              type: 'string',
              description: 'Language of the deck content',
              default: 'en',
            },
            isPublic: {
              type: 'boolean',
              description: 'Whether the deck is public',
              default: false,
            },
          },
          required: ['token', 'title'],
        },
      },
      {
        name: 'update_deck',
        description: 'Update an existing deck',
        inputSchema: {
          type: 'object',
          properties: {
            deckId: {
              type: 'string',
              description: 'ID of the deck to update',
            },
            title: {
              type: 'string',
              description: 'New title for the deck',
            },
            description: {
              type: 'string',
              description: 'New description for the deck',
            },
            level: {
              type: 'string',
              enum: ['simple', 'mid', 'expert'],
              description: 'New difficulty level',
            },
            isPublic: {
              type: 'boolean',
              description: 'New public status',
            },
          },
          required: ['deckId'],
        },
      },
      {
        name: 'delete_deck',
        description: 'Delete a deck and all its cards',
        inputSchema: {
          type: 'object',
          properties: {
            deckId: {
              type: 'string',
              description: 'ID of the deck to delete',
            },
          },
          required: ['deckId'],
        },
      },
      {
        name: 'list_cards',
        description: 'List all cards in a deck',
        inputSchema: {
          type: 'object',
          properties: {
            deckId: {
              type: 'string',
              description: 'ID of the deck',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of cards to return',
              default: 100,
            },
            offset: {
              type: 'number',
              description: 'Number of cards to skip',
              default: 0,
            },
          },
          required: ['deckId'],
        },
      },
      {
        name: 'create_cards',
        description: 'Create multiple cards in a deck (batch operation)',
        inputSchema: {
          type: 'object',
          properties: {
            deckId: {
              type: 'string',
              description: 'ID of the deck to add cards to',
            },
            cards: {
              type: 'array',
              description: 'Array of cards to create',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['basic', 'cloze', 'multiple_choice', 'explain'],
                    description: 'Type of card',
                  },
                  front: {
                    type: 'string',
                    description: 'Front side of the card (question)',
                  },
                  back: {
                    type: 'string',
                    description: 'Back side of the card (answer)',
                  },
                  choices: {
                    type: 'array',
                    description: 'Choices for multiple choice cards',
                    items: {
                      type: 'object',
                      properties: {
                        text: {
                          type: 'string',
                        },
                        isCorrect: {
                          type: 'boolean',
                        },
                      },
                      required: ['text', 'isCorrect'],
                    },
                  },
                  explanation: {
                    type: 'string',
                    description: 'Explanation for the answer',
                  },
                },
                required: ['type', 'front'],
              },
            },
          },
          required: ['deckId', 'cards'],
        },
      },
      {
        name: 'update_card',
        description: 'Update an existing card',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'string',
              description: 'ID of the card to update',
            },
            type: {
              type: 'string',
              enum: ['basic', 'cloze', 'multiple_choice', 'explain'],
            },
            front: {
              type: 'string',
            },
            back: {
              type: 'string',
            },
            choices: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: {
                    type: 'string',
                  },
                  isCorrect: {
                    type: 'boolean',
                  },
                },
              },
            },
            explanation: {
              type: 'string',
            },
          },
          required: ['cardId'],
        },
      },
      {
        name: 'delete_card',
        description: 'Delete a card',
        inputSchema: {
          type: 'object',
          properties: {
            cardId: {
              type: 'string',
              description: 'ID of the card to delete',
            },
          },
          required: ['cardId'],
        },
      },
      {
        name: 'get_deck_stats',
        description: 'Get statistics for decks',
        inputSchema: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'API token for authentication',
            },
            deckId: {
              type: 'string',
              description: 'Optional deck ID to filter stats',
            },
          },
          required: ['token'],
        },
      },
    ],
  }
})

// Helper function to get userId from token
async function getUserId(args: any): Promise<string> {
  const { token } = args
  
  if (!token) {
    throw new Error('API token is required')
  }
  
  const user = await validateApiToken(token)
  if (!user) {
    throw new Error('Invalid or expired API token')
  }
  
  return user.userId
}

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'list_decks': {
        const userId = await getUserId(args)
        const { includeCardCount } = args as { includeCardCount?: boolean }
        const decks = await deckRepository.findByUserId(userId, includeCardCount)
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, decks }, null, 2),
            },
          ],
        }
      }

      case 'create_deck': {
        const userId = await getUserId(args)
        const { token, ...deckFields } = args as any
        const deckData = { ...deckFields, userId }
        const deck = await deckRepository.create(deckData)
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, deck }, null, 2),
            },
          ],
        }
      }

      case 'update_deck': {
        const { deckId, ...updates } = args as { deckId: string; [key: string]: any }
        const deck = await deckRepository.update(deckId, updates)
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, deck }, null, 2),
            },
          ],
        }
      }

      case 'delete_deck': {
        const { deckId } = args as { deckId: string }
        const result = await deckRepository.delete(deckId)
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'list_cards': {
        const { deckId, limit = 100, offset = 0 } = args as { deckId: string; limit?: number; offset?: number }
        const cards = await cardRepository.findByDeckId(deckId, limit, offset)
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, cards }, null, 2),
            },
          ],
        }
      }

      case 'create_cards': {
        const { deckId, cards: cardInputs } = args as { deckId: string; cards: any[] }
        const cards = await cardRepository.createBatch(deckId, cardInputs)
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ 
                success: true, 
                created: cards.length,
                cards 
              }, null, 2),
            },
          ],
        }
      }

      case 'update_card': {
        const { cardId, ...updates } = args as { cardId: string; [key: string]: any }
        const card = await cardRepository.update(cardId, updates)
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, card }, null, 2),
            },
          ],
        }
      }

      case 'delete_card': {
        const { cardId } = args as { cardId: string }
        const result = await cardRepository.delete(cardId)
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'get_deck_stats': {
        const userId = await getUserId(args)
        const { deckId } = args as { deckId?: string }
        const stats = await deckRepository.getStats(userId, deckId)
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, stats }, null, 2),
            },
          ],
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
          }, null, 2),
        },
      ],
      isError: true,
    }
  }
})

// Start the server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Oblivian MCP server running on stdio')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
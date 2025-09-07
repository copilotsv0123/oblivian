#!/usr/bin/env tsx

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

// Parse command line arguments
const args = process.argv.slice(2)
let apiUrl = 'http://localhost:3000'
let accessToken = ''

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url' && args[i + 1]) {
    apiUrl = args[i + 1]
    i++
  } else if (args[i] === '--access-token' && args[i + 1]) {
    accessToken = args[i + 1]
    i++
  }
}

if (!accessToken) {
  console.error('Error: --access-token is required')
  process.exit(1)
}

// Helper function to make API calls
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const url = `${apiUrl}${endpoint}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API Error: ${response.status} - ${error}`)
  }

  return response.json()
}

// Create MCP server
const server = new Server(
  {
    name: 'oblivian-mcp',
    version: '2.0.0',
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
        description: 'List all your decks',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_deck',
        description: 'Get details of a specific deck',
        inputSchema: {
          type: 'object',
          properties: {
            deckId: {
              type: 'string',
              description: 'ID of the deck',
            },
          },
          required: ['deckId'],
        },
      },
      {
        name: 'create_deck',
        description: 'Create a new deck',
        inputSchema: {
          type: 'object',
          properties: {
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
              description: 'Difficulty level',
              default: 'simple',
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'list_cards',
        description: 'List cards in a deck',
        inputSchema: {
          type: 'object',
          properties: {
            deckId: {
              type: 'string',
              description: 'ID of the deck',
            },
          },
          required: ['deckId'],
        },
      },
      {
        name: 'create_card',
        description: 'Create a new card',
        inputSchema: {
          type: 'object',
          properties: {
            deckId: {
              type: 'string',
              description: 'ID of the deck',
            },
            type: {
              type: 'string',
              enum: ['basic', 'cloze'],
              description: 'Type of card',
              default: 'basic',
            },
            front: {
              type: 'string',
              description: 'Front of the card',
            },
            back: {
              type: 'string',
              description: 'Back of the card',
            },
          },
          required: ['deckId', 'front', 'back'],
        },
      },
      {
        name: 'create_cards_batch',
        description: 'Create multiple cards at once',
        inputSchema: {
          type: 'object',
          properties: {
            deckId: {
              type: 'string',
              description: 'ID of the deck',
            },
            cards: {
              type: 'array',
              description: 'Array of cards to create',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['basic', 'cloze'] },
                  front: { type: 'string' },
                  back: { type: 'string' },
                },
                required: ['front', 'back'],
              },
            },
          },
          required: ['deckId', 'cards'],
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
        name: 'get_api_info',
        description: 'Get information about the connected API',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ],
  }
})

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'list_decks': {
        const data = await apiCall('/api/decks')
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        }
      }

      case 'get_deck': {
        const { deckId } = args as { deckId: string }
        const data = await apiCall(`/api/decks/${deckId}`)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        }
      }

      case 'create_deck': {
        const data = await apiCall('/api/decks', {
          method: 'POST',
          body: JSON.stringify(args),
        })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        }
      }

      case 'list_cards': {
        const { deckId } = args as { deckId: string }
        const deckData = await apiCall(`/api/decks/${deckId}`)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(deckData.cards || [], null, 2),
            },
          ],
        }
      }

      case 'create_card': {
        const data = await apiCall('/api/cards', {
          method: 'POST',
          body: JSON.stringify(args),
        })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        }
      }

      case 'create_cards_batch': {
        const { deckId, cards } = args as { deckId: string; cards: any[] }
        const data = await apiCall('/api/cards/batch', {
          method: 'POST',
          body: JSON.stringify({ deckId, cards }),
        })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        }
      }

      case 'delete_card': {
        const { cardId } = args as { cardId: string }
        const data = await apiCall(`/api/cards/${cardId}`, {
          method: 'DELETE',
        })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        }
      }

      case 'get_api_info': {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                connected_to: apiUrl,
                token_preview: `${accessToken.slice(0, 8)}...${accessToken.slice(-4)}`,
                status: 'connected',
              }, null, 2),
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
            error: error instanceof Error ? error.message : 'Unknown error',
            tool: name,
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
  console.error(`Oblivian MCP Server connected to ${apiUrl}`)
}

main().catch((error) => {
  console.error('Server error:', error)
  process.exit(1)
})
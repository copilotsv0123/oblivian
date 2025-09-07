# Oblivian MCP Setup for Claude Desktop

## Architecture Overview
The Oblivian MCP server operates as an API client that connects to your running Oblivian web application. This architecture provides better security through token-based authentication and allows you to use your existing user account.

## Prerequisites
1. Oblivian web app running locally (`npm run dev`)
2. An API token created from the Settings page
3. Claude Desktop installed
4. Node.js 18+ installed

## Setup Instructions

### Step 1: Create an API Token
1. Start the Oblivian web app:
   ```bash
   npm run dev
   ```
2. Open http://localhost:3000 in your browser
3. Log in or create an account
4. Navigate to Settings (user menu → Settings)
5. Click "Create New Token"
6. Give it a descriptive name (e.g., "Claude Desktop")
7. **Copy the token immediately** - it starts with `obl_` and you won't see it again!

### Step 2: Configure Claude Desktop

Add this configuration to your Claude Desktop config file:

**Config file location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Configuration:**
```json
{
  "mcpServers": {
    "oblivian": {
      "command": "/Users/sderosiaux/Desktop/ai-projects/oblivian/mcp-server/run-mcp.sh",
      "args": [
        "--url",
        "http://localhost:3000",
        "--access-token",
        "YOUR_TOKEN_HERE"
      ]
    }
  }
}
```

Replace `YOUR_TOKEN_HERE` with your actual API token from Step 1.

### Step 3: Create the MCP Wrapper Script

The wrapper script should already exist at `mcp-server/run-mcp.sh`. If not, create it:

```bash
#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if ! command -v tsx &> /dev/null; then
    npx tsx "$SCRIPT_DIR/api-client.ts" "$@"
else
    tsx "$SCRIPT_DIR/api-client.ts" "$@"
fi
```

Make it executable:
```bash
chmod +x mcp-server/run-mcp.sh
```

### Step 4: Restart Claude Desktop
1. Completely quit Claude Desktop (Cmd+Q on macOS)
2. Restart Claude Desktop
3. The "oblivian" server should appear in the MCP servers list

## Available MCP Tools

Once configured, Claude can use these tools to interact with your Oblivian data:

### Deck Management
- **list_decks** - List all your decks
- **get_deck** - Get details of a specific deck
- **create_deck** - Create a new deck

### Card Management
- **list_cards** - List cards in a deck
- **create_card** - Create a single card
- **create_cards_batch** - Create multiple cards at once (up to 100)
- **delete_card** - Delete a card

### Utility
- **get_api_info** - Get information about the API connection

## Using MCP in Claude Desktop

Once configured, you can interact with Oblivian naturally in Claude Desktop:

### Example Prompts

**Deck Management:**
```
"List my Oblivian decks"
"Create a new deck called 'JavaScript Advanced Concepts'"
"Show me the cards in my Python deck"
```

**Card Creation:**
```
"Create 10 flashcards about Python basics for my deck"
"Generate cards about the French Revolution with cloze deletions"
"Add vocabulary cards for Spanish colors to my language deck"
```

**Batch Operations:**
```
"Create 20 cards about machine learning concepts"
"Generate a comprehensive deck about React hooks with 30 cards"
```

Claude will automatically:
1. Use your API token for authentication
2. Find or create the appropriate deck
3. Generate educational content based on your request
4. Create properly formatted cards (basic or cloze type)

## Troubleshooting

### MCP Server Not Appearing in Claude

1. **Verify the web app is running**: Check http://localhost:3000
2. **Check your token**: Ensure it's correctly copied in the config
3. **Verify paths**: Ensure all paths in the config are absolute
4. **Restart Claude**: Completely quit and restart Claude Desktop

### Authentication Errors

1. **Token expired or deleted**: Create a new token in Settings
2. **Wrong token**: Ensure you copied the complete token (starts with `obl_`)
3. **Web app not running**: Start the app with `npm run dev`

### Connection Errors

1. **Port conflict**: Ensure nothing else is using port 3000
2. **Firewall**: Check that localhost connections aren't blocked
3. **Web app errors**: Check the terminal for any server errors

### Viewing Logs

Check the Claude Desktop developer console for MCP-related errors and connection status.

## Testing the Connection

After setup, test with these simple commands in Claude:

1. "Use Oblivian to list my decks"
2. "Create a test deck in Oblivian"
3. "Show me the Oblivian API info"

If these work, your setup is complete!

## Security Notes

- **API tokens** are stored in your Claude Desktop configuration
- **Tokens can be revoked** at any time from the Settings page
- **Each token has access** only to your own data
- **Never share** your API tokens with others
- **The MCP server** runs locally and connects to your local web app

## Development Workflow

When making changes to the MCP server:

1. **Edit** the TypeScript files in `mcp-server/`
2. **Test** with the test script:
   ```bash
   npm run mcp:test
   ```
3. **Restart** Claude Desktop to load changes

## Advanced Usage

### Multiple Environments

You can configure multiple instances for different environments:

```json
{
  "mcpServers": {
    "oblivian-local": {
      "command": "/path/to/run-mcp.sh",
      "args": ["--url", "http://localhost:3000", "--access-token", "TOKEN_1"]
    },
    "oblivian-staging": {
      "command": "/path/to/run-mcp.sh",
      "args": ["--url", "https://staging.example.com", "--access-token", "TOKEN_2"]
    }
  }
}
```

### Custom API URLs

If running Oblivian on a different port or host, update the `--url` argument in the config.

## Tips for Best Results

1. **Be specific** about deck names when creating cards
2. **Use batch creation** for better performance (up to 100 cards at once)
3. **Specify card types** if you want cloze deletions vs basic cards
4. **Keep the web app running** while using MCP tools

## Support

- **Oblivian Issues**: Check the main README.md
- **MCP Protocol**: See [Model Context Protocol docs](https://modelcontextprotocol.io)
- **Claude Desktop**: Check Anthropic's documentation
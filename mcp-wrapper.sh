#!/bin/bash

# MCP Wrapper Script for Claude Desktop
# Ensures compatibility with mcp-remote package

# Check if Node.js 20+ is available
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)

if [ "$NODE_VERSION" -lt 20 ]; then
  echo "Error: Node.js 20+ is required for mcp-remote" >&2
  echo "Current version: $(node -v)" >&2
  
  # Try to use nvm to switch to Node 20+
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
    # Use Node 20 or 22 if available
    nvm use 20 2>/dev/null || nvm use 22 2>/dev/null || {
      echo "Please install Node.js 20+ using: nvm install 20" >&2
      exit 1
    }
  else
    echo "Please install Node.js 20+ to use MCP" >&2
    exit 1
  fi
fi

# Get the token from environment or arguments
TOKEN="${OBLIVIAN_TOKEN}"
URL="http://localhost:3000/api/mcp"

# Parse arguments to allow overrides
while [[ $# -gt 0 ]]; do
  case $1 in
    --token)
      TOKEN="$2"
      shift 2
      ;;
    --url)
      URL="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# Run mcp-remote with the correct Node version
exec npx -y mcp-remote "$URL" --header "Authorization: Bearer $TOKEN"
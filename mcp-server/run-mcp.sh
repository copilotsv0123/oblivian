#!/bin/bash

# MCP Server runner for Oblivian
# This script is called by Claude Desktop with API URL and token

set -e

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MCP_DIR="$SCRIPT_DIR"
PROJECT_ROOT="$(dirname "$MCP_DIR")"

# Change to MCP directory
cd "$MCP_DIR"

# Check if node_modules exists, install if not
if [ ! -d "node_modules" ]; then
    echo "Installing MCP dependencies..." >&2
    npm install >&2
fi

# Check if tsx is available
if ! command -v tsx &> /dev/null; then
    # Try to use npx tsx
    npx tsx api-client.ts "$@"
else
    # Use global tsx
    tsx api-client.ts "$@"
fi
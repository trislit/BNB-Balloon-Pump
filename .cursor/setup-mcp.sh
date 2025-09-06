#!/bin/bash

# Cursor MCP Setup Script
echo "🚀 Setting up MCP integration for Cursor..."

# Check if Cursor is installed (basic check)
if ! command -v cursor &> /dev/null && ! ls /Applications/Cursor.app &> /dev/null; then
    echo "⚠️  Cursor doesn't appear to be installed. Please install Cursor first."
    echo "Download from: https://cursor.sh"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required for MCP servers. Please install Node.js 18+."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create symbolic link to make cursor-client globally available (optional)
if [ ! -f "/usr/local/bin/cursor-mcp-client" ]; then
    echo "🔗 Creating global MCP client symlink..."
    sudo ln -sf "$(pwd)/mcp/cursor-client.js" /usr/local/bin/cursor-mcp-client 2>/dev/null || echo "⚠️  Could not create global symlink (sudo required)"
fi

# Test MCP configuration
echo "🧪 Testing MCP configuration..."
if [ -f "mcp/config.json" ]; then
    SERVER_COUNT=$(node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('mcp/config.json', 'utf8')).mcpServers).length)")
    echo "✅ Found $SERVER_COUNT MCP servers configured"
else
    echo "❌ MCP configuration file not found"
    exit 1
fi

# Test individual servers (optional)
echo "🔍 Testing MCP server connections..."
node mcp/cursor-utils.js list

echo ""
echo "🎯 MCP Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Restart Cursor to load MCP configuration"
echo "2. Check MCP panel in Cursor for available servers"
echo "3. Use the example prompts in .cursor/prompts/"
echo "4. Run 'node mcp/cursor-utils.js' for available commands"
echo ""
echo "Example usage in Cursor:"
echo "I need help with [task]. Please use [server-name] MCP server to assist."
echo ""
echo "📚 Documentation: .cursor/README.md"
echo "📝 Example prompts: .cursor/prompts/"



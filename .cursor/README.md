# Cursor MCP Integration

This directory contains the MCP (Model Context Protocol) configuration for Cursor IDE, allowing you to use your comprehensive set of AI/ML services directly within your coding workflow.

## 🚀 Quick Setup

1. **Ensure Cursor MCP is enabled** in your Cursor settings
2. **Restart Cursor** to load the MCP configuration
3. **Check MCP status** in Cursor's MCP panel

## 🔧 MCP Servers Available

### 🤖 AI & ML Services
- **🎨 Pixellab** - AI image generation and editing
- **🤗 Hugging Face** - Advanced ML models and NLP
- **🧠 Sequential Thinking** - AI reasoning and analysis
- **🤖 Gibson AI** - AI assistant and code generation
- **⚡ Augments** - AI-powered code augmentation

### ⛓️ Blockchain Services
- **⛓️ Tatum.io** - BNB Chain and multi-chain operations
- **◎ Solana Developer** - Solana blockchain development

### 🛠️ Development Tools
- **🐙 GitHub** - Repository management and CI/CD
- **▲ Vercel** - Deployment and hosting
- **🎭 Playwright** - Browser automation and testing
- **📁 File System** - Local file operations
- **🦐 Shrimp** - Task management and planning

### 🗄️ Data & Storage
- **⚡ Supabase** - Database and real-time features
- **🔒 Endgame** - Security analysis and auditing

## 💬 Using MCP in Cursor Prompts

### Example Prompts

#### Code Review with AI Analysis
```
I need to review this React component for performance issues and security vulnerabilities.

Please use the sequential-thinking MCP server to analyze the code structure and identify potential optimizations.

Also use the endgame server to check for security vulnerabilities.

Code to review:
```javascript
// Your React component code here
```
```

#### Smart Contract Development
```
Help me create a new smart contract for token staking on BNB Chain.

Use the tatumio MCP server to:
1. Check current gas prices
2. Validate contract logic
3. Simulate deployment

Requirements:
- ERC-20 compatible
- Staking rewards mechanism
- Emergency pause functionality
```

#### AI-Enhanced Feature Development
```
I want to add AI-powered image generation to my balloon game.

Use pixellab MCP server to:
1. Generate dynamic balloon images based on game state
2. Create animated sequences for popping balloons
3. Optimize images for web performance

Integration requirements:
- Real-time generation
- Multiple style variants
- Error handling for API failures
```

#### Database Optimization
```
Optimize my game leaderboard queries for better performance.

Use supabase MCP server to:
1. Analyze current query performance
2. Suggest indexing improvements
3. Implement caching strategies
4. Set up real-time subscriptions for live updates

Current schema:
```sql
-- Your database schema here
```
```

#### Automated Testing
```
Create comprehensive tests for my balloon pump game mechanics.

Use playwright MCP server to:
1. Set up automated browser testing
2. Test game interactions and edge cases
3. Generate visual regression tests
4. Create performance benchmarks

Game features to test:
- Balloon pumping mechanics
- Risk calculation logic
- Cashout functionality
- Multiplayer synchronization
```

## 🛠️ MCP Utilities

Use the provided utilities to enhance your MCP experience:

```bash
# List all available servers
node mcp/cursor-utils.js list

# Show server capabilities
node mcp/cursor-utils.js capabilities

# Get available tools for a server
node mcp/cursor-utils.js tools pixellab

# Generate prompt template
node mcp/cursor-utils.js template code-review

# Create custom MCP prompt
node mcp/cursor-utils.js prompt sequential-thinking "analyze this algorithm"
```

## 📝 Prompt Templates

### Code Analysis
```
Analyze this [language] code for:
- Performance bottlenecks
- Security vulnerabilities
- Code quality issues
- Best practices compliance

Use sequential-thinking for logic analysis
Use endgame for security review
Use filesystem to check related files
```

### Feature Planning
```
Plan the development of [feature name] with:
- Technical requirements
- Implementation strategy
- Testing approach
- Deployment considerations

Use shrimp for task breakdown
Use gibsonai for feature ideation
Use sequential-thinking for architecture planning
```

### Debug Session
```
Debug this [error/issue]:
- Error message: [details]
- Steps to reproduce: [steps]
- Expected behavior: [expected]
- Current behavior: [current]

Use sequential-thinking for root cause analysis
Use filesystem to examine relevant files
Use github to check for similar issues
```

## 🔗 Server-Specific Usage

### Pixellab (Image Generation)
```
Generate images for my game:
- Style: cartoonish, vibrant colors
- Subject: balloons in various inflation states
- Size: optimized for web (max 500KB)
- Format: WebP with PNG fallback
```

### Tatum.io (Blockchain)
```
BNB Chain operations:
- Check wallet balance
- Estimate gas costs
- Validate transaction data
- Monitor network status
- Deploy smart contracts
```

### Supabase (Database)
```
Database operations:
- Query optimization
- Real-time subscriptions
- User authentication
- Data validation
- Performance monitoring
```

## ⚙️ Configuration

Your MCP configuration is in `.cursor/mcp.json`. You can:

- Add new servers
- Modify existing server configurations
- Update API keys and endpoints
- Change server parameters

## 🔍 Troubleshooting

### Common Issues

1. **MCP servers not loading**
   - Check if Node.js is installed
   - Verify API keys are correct
   - Restart Cursor after configuration changes

2. **Connection timeouts**
   - Check internet connectivity
   - Verify server URLs are accessible
   - Update timeout settings if needed

3. **Permission errors**
   - Ensure proper file permissions
   - Check API key permissions
   - Verify server access tokens

### Debug Commands

```bash
# Test MCP server connectivity
node mcp/cursor-client.js <server-name>

# Check server configuration
node mcp/cursor-utils.js tools <server-name>

# Validate MCP setup
node mcp/cursor-utils.js capabilities
```

## 📚 Resources

- [Cursor MCP Documentation](https://cursor.sh/docs/mcp)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [MCP Server Registry](https://github.com/modelcontextprotocol/registry)

## 🎯 Best Practices

1. **Use specific server requests** - Be clear about which MCP server to use
2. **Provide context** - Include relevant code, requirements, and constraints
3. **Specify output format** - Indicate desired response format
4. **Test incrementally** - Start with small requests and build up
5. **Cache results** - Reuse successful patterns and configurations

## 🚀 Advanced Usage

### Multi-Server Coordination
```
Use multiple MCP servers together:
1. sequential-thinking for planning
2. pixellab for visual assets
3. tatumio for blockchain integration
4. supabase for data management
```

### Custom Workflows
```
Create custom MCP workflows:
- Code review pipeline
- Deployment automation
- Testing strategies
- Documentation generation
```

---

**Happy coding with MCP! 🎯**



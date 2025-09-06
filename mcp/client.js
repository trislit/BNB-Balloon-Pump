import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { spawn } from 'child_process';
import fs from 'fs';

class MCPClientManager {
  constructor() {
    this.clients = new Map();
    this.config = JSON.parse(fs.readFileSync('./mcp/config.json', 'utf8'));
  }

  async initializeServer(serverName, config) {
    try {
      const client = new Client(
        {
          name: `bnbballonpump-${serverName}`,
          version: '1.0.0',
        },
        {
          capabilities: {
            sampling: {},
          },
        }
      );

      let transport;

      if (config.transport === 'http' || config.transport === 'streamableHttp') {
        console.log(`⚠️ HTTP transport not available for ${serverName}, skipping...`);
        return null; // Skip HTTP-based servers for now
      } else if (config.transport === 'sse') {
        transport = new SSEClientTransport(new URL(config.url));
      } else if (config.command) {
        // Handle stdio transport for command-based servers
        const process = spawn(config.command, config.args || [], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, ...config.env },
        });

        transport = new StdioClientTransport(process.stdin, process.stdout);
      }

      if (transport) {
        await client.connect(transport);
        this.clients.set(serverName, client);
        console.log(`✅ Connected to ${serverName} MCP server`);
        return client;
      }
    } catch (error) {
      console.error(`❌ Failed to connect to ${serverName}:`, error.message);
    }
  }

  async initializeAllServers() {
    const initPromises = Object.entries(this.config.mcpServers).map(
      ([name, config]) => this.initializeServer(name, config)
    );

    const results = await Promise.allSettled(initPromises);

    // Filter out null results (skipped servers)
    const successfulConnections = results.filter(result =>
      result.status === 'fulfilled' && result.value !== null
    ).length;

    console.log(`\n🎯 MCP Client Manager initialized with ${successfulConnections} servers (${this.clients.size} active connections)`);
  }

  async callTool(serverName, toolName, args = {}) {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} not connected`);
    }

    try {
      const result = await client.request(
        { method: 'tools/call', params: { name: toolName, arguments: args } },
        null
      );
      return result;
    } catch (error) {
      console.error(`Error calling ${toolName} on ${serverName}:`, error);
      throw error;
    }
  }

  async getAvailableTools(serverName) {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Server ${serverName} not connected`);
    }

    try {
      const response = await client.request({ method: 'tools/list' }, null);
      return response.tools || [];
    } catch (error) {
      console.error(`Error getting tools from ${serverName}:`, error);
      return [];
    }
  }

  async generateImage(prompt, style = 'meme') {
    return this.callTool('pixellab', 'generate_image', { prompt, style });
  }

  async analyzeCode(code, context = 'memecoin-game') {
    return this.callTool('sequential-thinking', 'analyze_code', { code, context });
  }

  async storeGameData(data) {
    return this.callTool('supabase', 'store_data', { table: 'game_data', data });
  }

  async deployContract(contractCode) {
    return this.callTool('solana-developer', 'deploy_contract', { code: contractCode });
  }

  async getBlockchainData(address) {
    return this.callTool('tatumio', 'get_balance', { address, chain: 'BNB' });
  }

  getConnectedServers() {
    return Array.from(this.clients.keys());
  }

  disconnectAll() {
    for (const [name, client] of this.clients) {
      try {
        client.disconnect();
        console.log(`Disconnected from ${name}`);
      } catch (error) {
        console.error(`Error disconnecting from ${name}:`, error);
      }
    }
    this.clients.clear();
  }
}

// Export singleton instance
const mcpManager = new MCPClientManager();

export { MCPClientManager, mcpManager };


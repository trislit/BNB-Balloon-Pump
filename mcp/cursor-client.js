#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { HTTPClientTransport } from '@modelcontextprotocol/sdk/client/http.js';
import { spawn } from 'child_process';

const serverName = process.argv[2];
if (!serverName) {
  console.error('Usage: cursor-client.js <server-name>');
  process.exit(1);
}

// Load configuration from the main config file
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, 'config.json');

let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error('Failed to load MCP config:', error.message);
  process.exit(1);
}

const serverConfig = config.mcpServers[serverName];
if (!serverConfig) {
  console.error(`Server "${serverName}" not found in configuration`);
  process.exit(1);
}

async function createMCPClient() {
  const client = new Client(
    {
      name: `cursor-${serverName}`,
      version: '1.0.0',
    },
    {
      capabilities: {
        sampling: {},
      },
    }
  );

  let transport;

  try {
    if (serverConfig.transport === 'http') {
      transport = new HTTPClientTransport(
        new URL(serverConfig.url),
        {
          headers: serverConfig.headers || {},
        }
      );
    } else if (serverConfig.transport === 'sse') {
      transport = new SSEClientTransport(new URL(serverConfig.url));
    } else if (serverConfig.transport === 'streamableHttp') {
      // Handle streamable HTTP transport
      transport = new HTTPClientTransport(new URL(serverConfig.url));
    } else if (serverConfig.command) {
      // Handle stdio transport for command-based servers
      const env = { ...process.env, ...serverConfig.env };
      const process = spawn(serverConfig.command, serverConfig.args || [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env,
      });

      transport = new StdioClientTransport(process.stdin, process.stdout);

      // Handle process errors
      process.on('error', (error) => {
        console.error(`Failed to start ${serverName} process:`, error);
        process.exit(1);
      });

      process.on('exit', (code) => {
        if (code !== 0) {
          console.error(`${serverName} process exited with code ${code}`);
        }
        process.exit(code);
      });
    } else {
      console.error(`Unsupported transport type for ${serverName}`);
      process.exit(1);
    }

    await client.connect(transport);
    console.error(`✅ Connected to ${serverName} MCP server`);

    // Start processing MCP messages from stdin
    process.stdin.on('data', async (data) => {
      try {
        const message = JSON.parse(data.toString().trim());

        if (message.method === 'tools/list') {
          const response = await client.request({ method: 'tools/list' }, null);
          console.log(JSON.stringify({
            jsonrpc: '2.0',
            id: message.id,
            result: response
          }));
        } else if (message.method === 'tools/call') {
          const response = await client.request(message, null);
          console.log(JSON.stringify({
            jsonrpc: '2.0',
            id: message.id,
            result: response
          }));
        } else {
          // Forward other messages
          const response = await client.request(message, null);
          console.log(JSON.stringify({
            jsonrpc: '2.0',
            id: message.id,
            result: response
          }));
        }
      } catch (error) {
        console.error('Error processing MCP message:', error);
        console.log(JSON.stringify({
          jsonrpc: '2.0',
          id: message.id || null,
          error: { code: -32603, message: error.message }
        }));
      }
    });

    // Handle process termination
    process.on('SIGINT', () => {
      console.error(`Disconnecting from ${serverName}...`);
      client.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.error(`Disconnecting from ${serverName}...`);
      client.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error(`❌ Failed to connect to ${serverName}:`, error.message);
    process.exit(1);
  }
}

// Start the MCP client
createMCPClient().catch((error) => {
  console.error('Failed to create MCP client:', error);
  process.exit(1);
});



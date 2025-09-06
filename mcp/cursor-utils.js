#!/usr/bin/env node

/**
 * Cursor MCP Utilities
 * Helper functions for using MCP servers in Cursor prompts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CursorMCPUtils {
  constructor() {
    this.configPath = path.join(__dirname, 'config.json');
    this.loadConfig();
  }

  loadConfig() {
    try {
      this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
    } catch (error) {
      console.error('Failed to load MCP config:', error.message);
      this.config = { mcpServers: {} };
    }
  }

  getAvailableServers() {
    return Object.keys(this.config.mcpServers);
  }

  getServerConfig(serverName) {
    return this.config.mcpServers[serverName];
  }

  getServerCapabilities() {
    const capabilities = {};

    // AI/ML Capabilities
    if (this.config.mcpServers.pixellab) {
      capabilities.imageGeneration = 'pixellab';
    }
    if (this.config.mcpServers['hf-mcp-server']) {
      capabilities.aiModels = 'hf-mcp-server';
    }
    if (this.config.mcpServers['sequential-thinking']) {
      capabilities.reasoning = 'sequential-thinking';
    }
    if (this.config.mcpServers.gibsonai) {
      capabilities.aiAssistant = 'gibsonai';
    }

    // Blockchain Capabilities
    if (this.config.mcpServers.tatumio) {
      capabilities.blockchain = 'tatumio';
    }
    if (this.config.mcpServers['solana-developer']) {
      capabilities.solana = 'solana-developer';
    }

    // Development Tools
    if (this.config.mcpServers.github) {
      capabilities.versionControl = 'github';
    }
    if (this.config.mcpServers.vercel) {
      capabilities.deployment = 'vercel';
    }
    if (this.config.mcpServers.playwright) {
      capabilities.testing = 'playwright';
    }

    // Database & Storage
    if (this.config.mcpServers.supabase) {
      capabilities.database = 'supabase';
    }

    // File System
    if (this.config.mcpServers.filesystem) {
      capabilities.fileSystem = 'filesystem';
    }

    // Task Management
    if (this.config.mcpServers.shrimp) {
      capabilities.taskManagement = 'shrimp';
    }

    // Security
    if (this.config.mcpServers.endgame) {
      capabilities.security = 'endgame';
    }

    return capabilities;
  }

  generatePromptTemplate(taskType) {
    const capabilities = this.getServerCapabilities();

    const templates = {
      'code-review': `
Please review the following code using available MCP servers:

${capabilities.reasoning ? `🤔 Use sequential-thinking for code analysis` : ''}
${capabilities.security ? `🔒 Use endgame for security analysis` : ''}
${capabilities.versionControl ? `🐙 Check github for related issues` : ''}

Code to review:
\`\`\`
// Your code here
\`\`\`
`,

      'feature-development': `
Develop a new feature using MCP server assistance:

${capabilities.aiAssistant ? `🤖 Use gibsonai for feature planning` : ''}
${capabilities.taskManagement ? `🦐 Use shrimp for task breakdown` : ''}
${capabilities.reasoning ? `🧠 Use sequential-thinking for implementation strategy` : ''}

Feature requirements:
- Description: [Your feature description]
- Tech stack: [Your tech stack]
- Timeline: [Your timeline]
`,

      'debugging': `
Debug this issue using MCP server tools:

${capabilities.reasoning ? `🤔 Use sequential-thinking for root cause analysis` : ''}
${capabilities.fileSystem ? `📁 Use filesystem to examine related files` : ''}
${capabilities.database ? `⚡ Check supabase for data-related issues` : ''}

Error details:
\`\`\`
// Error message and stack trace
\`\`\`

Current code state:
\`\`\`
// Relevant code section
\`\`\`
`,

      'blockchain-integration': `
Implement blockchain functionality:

${capabilities.blockchain ? `⛓️ Use tatumio for BNB Chain operations` : ''}
${capabilities.solana ? `◎ Use solana-developer for cross-chain features` : ''}
${capabilities.security ? `🔒 Use endgame for smart contract security` : ''}

Requirements:
- Network: [BNB Chain/Mainnet/Testnet]
- Functionality: [Token minting/transfers/etc]
- Security requirements: [Audit requirements]
`,

      'ai-enhancement': `
Enhance application with AI features:

${capabilities.aiModels ? `🤗 Use hf-mcp-server for ML models` : ''}
${capabilities.imageGeneration ? `🎨 Use pixellab for image generation` : ''}
${capabilities.reasoning ? `🧠 Use sequential-thinking for AI logic` : ''}

AI Feature:
- Type: [Chatbot/Image generation/Text analysis/etc]
- Integration: [API/Database/File system]
- User experience: [Real-time/Background/Batch]
`,

      'deployment': `
Deploy application using available tools:

${capabilities.deployment ? `▲ Use vercel for frontend deployment` : ''}
${capabilities.versionControl ? `🐙 Use github for CI/CD` : ''}
${capabilities.blockchain ? `⛓️ Use tatumio for contract deployment` : ''}

Deployment requirements:
- Environment: [Development/Staging/Production]
- Platform: [Web3/Browser/Mobile]
- Scaling: [Static/Dynamic/Serverless]
`
    };

    return templates[taskType] || `
Please use the following MCP servers for assistance:

Available servers: ${this.getAvailableServers().join(', ')}

${Object.entries(capabilities).map(([type, server]) =>
  `${this.getServerIcon(type)} ${type}: ${server}`
).join('\n')}

Task: [Describe your task here]
`;
  }

  getServerIcon(capability) {
    const icons = {
      imageGeneration: '🎨',
      aiModels: '🤗',
      reasoning: '🧠',
      aiAssistant: '🤖',
      blockchain: '⛓️',
      solana: '◎',
      versionControl: '🐙',
      deployment: '▲',
      testing: '🎭',
      database: '⚡',
      fileSystem: '📁',
      taskManagement: '🦐',
      security: '🔒'
    };
    return icons[capability] || '🔗';
  }

  listServerTools(serverName) {
    const server = this.getServerConfig(serverName);
    if (!server) {
      return `Server "${serverName}" not found`;
    }

    let tools = [];

    switch (serverName) {
      case 'pixellab':
        tools = ['generate_image', 'edit_image', 'analyze_image'];
        break;
      case 'hf-mcp-server':
        tools = ['text_generation', 'image_classification', 'sentiment_analysis', 'translation'];
        break;
      case 'sequential-thinking':
        tools = ['analyze_code', 'generate_plan', 'debug_logic', 'optimize_solution'];
        break;
      case 'tatumio':
        tools = ['get_balance', 'send_transaction', 'deploy_contract', 'get_transaction_history'];
        break;
      case 'github':
        tools = ['search_issues', 'create_pr', 'review_code', 'manage_releases'];
        break;
      case 'supabase':
        tools = ['query_database', 'store_data', 'realtime_subscriptions', 'auth_management'];
        break;
      case 'filesystem':
        tools = ['read_file', 'write_file', 'list_directory', 'search_files'];
        break;
      case 'playwright':
        tools = ['automate_browser', 'take_screenshot', 'run_tests', 'scrape_data'];
        break;
      default:
        tools = ['list_tools', 'call_tool'];
    }

    return `Available tools for ${serverName}:\n${tools.map(tool => `  • ${tool}`).join('\n')}`;
  }

  createMCPPrompt(serverName, task) {
    const server = this.getServerConfig(serverName);
    if (!server) {
      return `Server "${serverName}" not found in configuration.`;
    }

    return `
Use MCP server: ${serverName}
Task: ${task}

Server configuration:
${JSON.stringify(server, null, 2)}

Example usage in Cursor:
\`\`\`
I need to ${task}

Please use the ${serverName} MCP server to help with this task.
Available tools: ${this.listServerTools(serverName)}
\`\`\`
`;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const utils = new CursorMCPUtils();
  const command = process.argv[2];

  switch (command) {
    case 'list':
      console.log('Available MCP servers:');
      console.log(utils.getAvailableServers().join('\n'));
      break;

    case 'capabilities':
      console.log('MCP Server Capabilities:');
      console.log(JSON.stringify(utils.getServerCapabilities(), null, 2));
      break;

    case 'tools':
      const serverName = process.argv[3];
      if (!serverName) {
        console.error('Usage: cursor-utils.js tools <server-name>');
        process.exit(1);
      }
      console.log(utils.listServerTools(serverName));
      break;

    case 'template':
      const taskType = process.argv[3] || 'general';
      console.log('Cursor MCP Prompt Template:');
      console.log(utils.generatePromptTemplate(taskType));
      break;

    case 'prompt':
      const server = process.argv[3];
      const task = process.argv.slice(4).join(' ');
      if (!server || !task) {
        console.error('Usage: cursor-utils.js prompt <server-name> <task>');
        process.exit(1);
      }
      console.log(utils.createMCPPrompt(server, task));
      break;

    default:
      console.log(`
Cursor MCP Utilities

Usage:
  cursor-utils.js list                          - List all available MCP servers
  cursor-utils.js capabilities                  - Show server capabilities
  cursor-utils.js tools <server>                - List tools for a server
  cursor-utils.js template [task-type]          - Generate prompt template
  cursor-utils.js prompt <server> <task>        - Create MCP prompt

Task types for templates:
  code-review, feature-development, debugging
  blockchain-integration, ai-enhancement, deployment

Available servers: ${utils.getAvailableServers().join(', ')}
`);
  }
}

export default CursorMCPUtils;



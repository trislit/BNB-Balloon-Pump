/**
 * Test Token Configuration
 * This file contains the test token address used throughout the system
 */

// Test token address (placeholder for future meme coins)
export const TEST_TOKEN_ADDRESS = '0xTEST0000000000000000000000000000000000000';

// Token metadata
export const TEST_TOKEN_INFO = {
  address: TEST_TOKEN_ADDRESS,
  symbol: 'TEST',
  name: 'Test Token',
  decimals: 18,
  description: 'Test token for development - placeholder for future meme coins',
  isTestToken: true
};

// Configuration for different environments
export const TOKEN_CONFIG = {
  development: {
    address: TEST_TOKEN_ADDRESS,
    symbol: 'TEST',
    name: 'Test Token',
    isTestMode: true
  },
  production: {
    // Future meme coin addresses will go here
    // address: '0xMEME0000000000000000000000000000000000000',
    // symbol: 'MEME',
    // name: 'Meme Coin',
    // isTestMode: false
  }
};

// Get current token config based on environment
export function getCurrentTokenConfig() {
  const env = process.env.NODE_ENV || 'development';
  return TOKEN_CONFIG[env] || TOKEN_CONFIG.development;
}

// Helper function to check if address is test token
export function isTestToken(address) {
  return address === TEST_TOKEN_ADDRESS;
}

// Helper function to get token display name
export function getTokenDisplayName(address) {
  if (isTestToken(address)) {
    return 'Test Token';
  }
  return 'Unknown Token';
}

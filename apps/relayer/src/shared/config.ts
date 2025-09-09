// Shared configuration for Balloon Pump Game

import { ChainConfig, ContractConfig } from './types';

// Chain Configurations
export const CHAINS: Record<string, ChainConfig> = {
  '56': { // BNB Mainnet
    id: '56',
    name: 'BNB Smart Chain',
    rpcUrls: [
      'https://bsc-dataseed1.binance.org/',
      'https://bsc-dataseed2.binance.org/',
      'https://bsc-dataseed3.binance.org/',
    ],
    blockExplorerUrl: 'https://bscscan.com',
    contracts: {
      balloonPump: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '',
    },
    tokens: {
      BNB: '0x0000000000000000000000000000000000000000',
      USDT: '0x55d398326f99059fF775485246999027B3197955', // BEP-20 USDT
      USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // BEP-20 USDC
    },
  },
  '97': { // BNB Testnet
    id: '97',
    name: 'BNB Smart Chain Testnet',
    rpcUrls: [
      'https://data-seed-prebsc-1-s1.binance.org:8545/',
      'https://data-seed-prebsc-2-s1.binance.org:8545/',
    ],
    blockExplorerUrl: 'https://testnet.bscscan.com',
    contracts: {
      balloonPump: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '',
    },
    tokens: {
      BNB: '0x0000000000000000000000000000000000000000',
      USDT: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd', // Testnet BEP-20 USDT
      USDC: '0x64544969ed7EBf5f083679233325356EbE738930', // Testnet BEP-20 USDC
    },
  },
};

// Default Contract Configuration
export const DEFAULT_CONTRACT_CONFIG: ContractConfig = {
  feeBps: 100, // 1%
  maxPerPump: BigInt('1000000000000000000000'), // 1000 tokens
  maxPerRoundUser: BigInt('10000000000000000000000'), // 10000 tokens
  feeWallet: '0x0000000000000000000000000000000000000000', // To be set
  burnWallet: '0x0000000000000000000000000000000000000000', // Dead address
  relayer: '0x0000000000000000000000000000000000000000', // To be set
};

// Environment-specific configuration
export const getChainConfig = (chainId: string = '97'): ChainConfig => {
  const config = CHAINS[chainId];
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return config;
};

export const getCurrentChainConfig = (): ChainConfig => {
  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || '97';
  return getChainConfig(chainId);
};

// Utility functions
export const isMainnet = (chainId: string): boolean => chainId === '56';
export const isTestnet = (chainId: string): boolean => chainId === '97';

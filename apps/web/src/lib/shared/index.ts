// Export all shared types, configurations, and utilities

export * from './types';
export * from './config';
export * from './abi';

// Utility functions - compatible with viem 2.x
export const formatEther = (wei: bigint): string => {
  return (Number(wei) / 1e18).toFixed(6);
};

export const parseEther = (ether: string): bigint => {
  return BigInt(Math.floor(parseFloat(ether) * 1e18));
};

export const shortenAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

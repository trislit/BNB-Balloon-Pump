// Shared types for Balloon Pump Game

import { z } from 'zod';

// Chain Configuration
export const ChainId = z.enum(['56', '97']); // BNB Mainnet, Testnet
export type ChainId = z.infer<typeof ChainId>;

export const ChainConfig = z.object({
  id: ChainId,
  name: z.string(),
  rpcUrls: z.array(z.string()),
  blockExplorerUrl: z.string(),
  contracts: z.object({
    balloonPump: z.string(),
  }),
  tokens: z.record(z.string()), // token symbol -> address
});
export type ChainConfig = z.infer<typeof ChainConfig>;

// User & Auth Types
export const UserProfile = z.object({
  id: z.string(),
  evmAddress: z.string(),
  createdAt: z.date(),
});
export type UserProfile = z.infer<typeof UserProfile>;

export const AuthSession = z.object({
  user: UserProfile,
  siweMessage: z.string().optional(),
  expires: z.date(),
});
export type AuthSession = z.infer<typeof AuthSession>;

// Game Types
export const RoundStatus = z.enum(['OPEN', 'POPPED', 'SETTLED']);
export type RoundStatus = z.infer<typeof RoundStatus>;

export const Round = z.object({
  id: z.bigint(),
  status: RoundStatus,
  pressure: z.bigint(),
  pot: z.bigint(),
  threshold: z.bigint(),
  lastThree: z.array(z.string()), // wallet addresses
  openedAt: z.date(),
  poppedAt: z.date().optional(),
  settledAt: z.date().optional(),
});
export type Round = z.infer<typeof Round>;

export const PumpRequest = z.object({
  id: z.string(),
  userId: z.string(),
  roundId: z.bigint(),
  token: z.string(),
  spend: z.bigint(),
  requestedAt: z.date(),
  relayedTx: z.string().optional(),
  status: z.enum(['queued', 'sent', 'confirmed', 'failed']),
});
export type PumpRequest = z.infer<typeof PumpRequest>;

export const Deposit = z.object({
  tx: z.string(),
  userId: z.string(),
  token: z.string(),
  amount: z.bigint(),
  roundId: z.bigint().optional(),
  confirmed: z.boolean(),
  chainSlot: z.bigint(),
  createdAt: z.date(),
});
export type Deposit = z.infer<typeof Deposit>;

// Contract Event Types
export const DepositedEvent = z.object({
  user: z.string(),
  token: z.string(),
  amount: z.bigint(),
  roundId: z.bigint().optional(),
});
export type DepositedEvent = z.infer<typeof DepositedEvent>;

export const PumpedEvent = z.object({
  roundId: z.bigint(),
  user: z.string(),
  token: z.string(),
  spend: z.bigint(),
  pressure: z.bigint(),
  pot: z.bigint(),
});
export type PumpedEvent = z.infer<typeof PumpedEvent>;

export const PoppedEvent = z.object({
  roundId: z.bigint(),
  pot: z.bigint(),
  last: z.string(),
  second: z.string(),
  third: z.string(),
});
export type PoppedEvent = z.infer<typeof PoppedEvent>;

export const SettledEvent = z.object({
  roundId: z.bigint(),
  payouts: z.array(z.object({
    user: z.string(),
    amount: z.bigint(),
  })),
});
export type SettledEvent = z.infer<typeof SettledEvent>;

// Configuration Types
export const ContractConfig = z.object({
  feeBps: z.number(),
  maxPerPump: z.bigint(),
  maxPerRoundUser: z.bigint(),
  feeWallet: z.string(),
  burnWallet: z.string(),
  relayer: z.string(),
});
export type ContractConfig = z.infer<typeof ContractConfig>;

export const RelayerConfig = z.object({
  rpcUrlPrimary: z.string(),
  rpcUrlFallback: z.string(),
  privateKey: z.string(),
  contractAddress: z.string(),
  supabaseUrl: z.string(),
  supabaseServiceKey: z.string(),
  maxTxPerMinute: z.number(),
  maxPendingTx: z.number(),
  priorityFee: z.bigint().optional(),
});
export type RelayerConfig = z.infer<typeof RelayerConfig>;

export const IndexerConfig = z.object({
  rpcUrlPrimary: z.string(),
  rpcUrlFallback: z.string(),
  contractAddress: z.string(),
  supabaseUrl: z.string(),
  supabaseServiceKey: z.string(),
  chainId: ChainId,
  startBlock: z.bigint().optional(),
});
export type IndexerConfig = z.infer<typeof IndexerConfig>;

// UI Types
export const GameState = z.object({
  currentRound: Round.optional(),
  userProfile: UserProfile.optional(),
  userDeposits: z.array(Deposit),
  pendingPumps: z.array(PumpRequest),
  leaderboard: z.array(z.object({
    userId: z.string(),
    netWinnings: z.bigint(),
    totalDeposited: z.bigint(),
    popsTriggered: z.number(),
  })),
});
export type GameState = z.infer<typeof GameState>;

// Error Types
export const AppError = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.any()).optional(),
});
export type AppError = z.infer<typeof AppError>;

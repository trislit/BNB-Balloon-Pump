// Relayer Service Types

export interface PumpRequest {
  id: string;
  userAddress: string;
  sessionId: string;
  token: string;
  amount: bigint;
  roundId?: bigint;
  retryCount?: number;
  requestedAt: Date;
}

export interface PumpResult {
  success: boolean;
  requestId: string;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  duration?: number;
  error?: string;
  pending?: boolean; // Indicates blockchain confirmation pending
  balloon_popped?: boolean;
  pressure?: string;
  pot?: string;
  winner?: string;
  winner_amount?: string;
  winner_payout?: string;
  last_pumper?: string;
  pop_chance?: number;
}

export interface QueueStatus {
  queued: number;
  processing: number;
  isActive: boolean;
  lastProcessed: string;
  error?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  blockNumber?: number;
  relayerBalance?: string;
  network?: {
    name: string;
    chainId: bigint;
  };
  queue?: QueueStatus;
  uptime?: number;
  timestamp: string;
}

// API Request/Response types
export interface PumpRequestBody {
  userAddress: string;
  sessionId: string;
  token: string;
  amount: string; // Will be converted to bigint
  roundId?: string;
}

export interface PumpResponse {
  success: boolean;
  requestId?: string;
  transactionHash?: string;
  message?: string;
  error?: string;
}

// Configuration types
export interface RelayerConfig {
  rpcUrlPrimary: string;
  rpcUrlFallback?: string;
  privateKey: string;
  contractAddress: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  maxTxPerMinute: number;
  maxPendingTx: number;
  priorityFee?: bigint;
}

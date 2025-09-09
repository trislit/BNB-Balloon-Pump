const RELAYER_URL = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3001';

export interface PumpRequest {
  userAddress: string;
  amount: string;
}

export interface PumpResult {
  success: boolean;
  requestId: string;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  duration?: number;
  error?: string;
  pending?: boolean;
}

export interface GameState {
  roundId: number;
  currentPressure: number;
  maxPressure: number;
  potAmount: string;
  participantCount: number;
  lastPumpedBy?: string;
  timeRemaining?: number;
}

export interface LeaderboardEntry {
  user_id: string;
  nickname?: string;
  total_pumps: number;
  total_winnings: string;
  created_at: string;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = RELAYER_URL;
  }

  async pump(request: PumpRequest): Promise<PumpResult> {
    const response = await fetch(`${this.baseUrl}/api/pump`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getGameState(): Promise<GameState> {
    const response = await fetch(`${this.baseUrl}/api/pump/state`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getUserBalance(userAddress: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/pump/balance/${userAddress}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.balance;
  }

  async getUserPumps(userAddress: string, limit = 10): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/api/pump/user/${userAddress}?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.pumps || [];
  }

  async getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
    const response = await fetch(`${this.baseUrl}/api/pump/leaderboard?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.leaderboard || [];
  }

  async getHealthStatus(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/health`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

export const apiClient = new ApiClient();

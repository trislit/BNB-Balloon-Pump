import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
}
const supabase = createClient(supabaseUrl, supabaseKey);

// Database Tables (SQL DDL for Supabase)
/*
-- User Sessions Table
CREATE TABLE user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  wallet_address TEXT NOT NULL,
  player_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  game_stats JSONB DEFAULT '{
    "totalGames": 0,
    "totalPumps": 0,
    "totalWins": 0,
    "totalEarnings": "0",
    "bestWin": "0"
  }',
  preferences JSONB DEFAULT '{
    "soundEnabled": true,
    "animationsEnabled": true,
    "theme": "dark"
  }',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game Sessions Table
CREATE TABLE game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  game_id TEXT NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished', 'cancelled')),
  game_state JSONB DEFAULT '{
    "balloonSize": "0",
    "totalVaultBalance": "0",
    "currentJackpot": "0",
    "popProbability": 0,
    "lastPumpTime": null,
    "pumperCount": 0
  }',
  blockchain_data JSONB DEFAULT '{}',
  winner JSONB,
  rewards JSONB DEFAULT '[]',
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game Players Table (many-to-many relationship)
CREATE TABLE game_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  player_name TEXT NOT NULL,
  vault_balance TEXT DEFAULT '0',
  total_pumps INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Actions Table
CREATE TABLE user_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('join_game', 'deposit_vault', 'pump_balloon', 'withdraw_vault', 'claim_reward')),
  amount TEXT,
  transaction_hash TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blockchain Cache Table
CREATE TABLE blockchain_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_sessions_wallet ON user_sessions(wallet_address);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_game_sessions_game_id ON game_sessions(game_id);
CREATE INDEX idx_game_sessions_status ON game_sessions(status);
CREATE INDEX idx_user_actions_session ON user_actions(session_id);
CREATE INDEX idx_user_actions_wallet ON user_actions(wallet_address);
CREATE INDEX idx_blockchain_cache_key ON blockchain_cache(cache_key);
CREATE INDEX idx_blockchain_cache_expires ON blockchain_cache(expires_at);

-- Row Level Security (RLS) Policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (wallet_address = current_setting('app.current_wallet_address', true));

CREATE POLICY "Users can insert own sessions" ON user_sessions
  FOR INSERT WITH CHECK (wallet_address = current_setting('app.current_wallet_address', true));

CREATE POLICY "Users can update own sessions" ON user_sessions
  FOR UPDATE USING (wallet_address = current_setting('app.current_wallet_address', true));

-- Similar policies for other tables...
*/

export class DatabaseService {
  constructor() {
    this.supabase = supabase;
    this.isConnected = false;
    this.currentWalletAddress = null;
  }

  // Set wallet address for RLS policies
  setWalletContext(walletAddress) {
    this.currentWalletAddress = walletAddress?.toLowerCase();

    // Set the wallet address in the Supabase context for RLS
    if (this.currentWalletAddress) {
      // Note: This requires custom RLS policies that read from app.current_wallet_address
      // For now, we're using permissive policies for development
      console.log(`🔑 Wallet context set: ${this.currentWalletAddress}`);
    }
  }

  async initialize() {
    try {
      // Test connection
      const { data, error } = await this.supabase
        .from('user_sessions')
        .select('count')
        .limit(1);

      if (error) {
        console.log('⚠️  Supabase tables may not exist yet. Please run the SQL setup in the dashboard.');
        console.log('📋 SQL Setup: Check the comments at the top of this file');
        // Don't throw error - allow app to continue without database
        this.isConnected = false;
        return;
      }

      this.isConnected = true;
      console.log('✅ Connected to Supabase database');
      console.log('🎯 Supabase features: Real-time subscriptions, built-in auth, auto-generated APIs');

    } catch (error) {
      console.error('❌ Failed to connect to Supabase:', error.message);
      console.log('💡 Tip: Make sure your SUPABASE_URL and SUPABASE_ANON_KEY are set in .env');
      this.isConnected = false;
    }
  }

  async disconnect() {
    // Supabase handles connection automatically
    this.isConnected = false;
    console.log('✅ Disconnected from Supabase');
  }

  // User Session Management
  async createUserSession(walletAddress, playerName, sessionData = {}) {
    if (!this.isConnected) return null;

    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data, error } = await this.supabase
        .from('user_sessions')
        .insert([{
          session_id: sessionId,
          wallet_address: walletAddress.toLowerCase(),
          player_name: playerName,
          token_balance: sessionData.tokenBalance || "1000",
          game_stats: sessionData.gameStats || {
            totalGames: 0,
            totalPumps: 0,
            totalWins: 0,
            totalEarnings: "0",
            bestWin: "0"
          },
          preferences: sessionData.preferences || {
            soundEnabled: true,
            animationsEnabled: true,
            theme: "dark"
          }
        }])
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Created user session: ${sessionId}`);
      return data;
    } catch (error) {
      console.error('❌ Failed to create user session:', error.message);
      return null;
    }
  }

  async getUserSession(sessionId) {
    if (!this.isConnected) return null;

    try {
      const { data, error } = await this.supabase
        .from('user_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('❌ Failed to get user session:', error.message);
      return null;
    }
  }

  async getUserSessionByWallet(walletAddress) {
    if (!this.isConnected) return null;

    try {
      const { data, error } = await this.supabase
        .from('user_sessions')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('❌ Failed to get user session by wallet:', error.message);
      return null;
    }
  }

  async updateUserSession(sessionId, updateData) {
    if (!this.isConnected) return null;

    try {
      const { data, error } = await this.supabase
        .from('user_sessions')
        .update({
          ...updateData,
          last_activity: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Failed to update user session:', error.message);
      return null;
    }
  }

  async endUserSession(sessionId) {
    if (!this.isConnected) return;

    try {
      const { error } = await this.supabase
        .from('user_sessions')
        .update({
          is_active: false,
          last_activity: new Date().toISOString()
        })
        .eq('session_id', sessionId);

      if (error) throw error;
      console.log(`✅ Ended user session: ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to end user session:', error.message);
    }
  }

  // Game Session Management
  async createGameSession(gameId, initialData = {}) {
    if (!this.isConnected) return null;

    try {
      const sessionId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data, error } = await this.supabase
        .from('game_sessions')
        .insert([{
          session_id: sessionId,
          game_id: gameId,
          game_state: initialData.gameState || {
            balloonSize: "0",
            totalVaultBalance: "0",
            currentJackpot: "0",
            popProbability: 0,
            lastPumpTime: null,
            pumperCount: 0
          },
          blockchain_data: initialData.blockchainData || {}
        }])
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Created game session: ${sessionId}`);
      return data;
    } catch (error) {
      console.error('❌ Failed to create game session:', error.message);
      return null;
    }
  }

  async getGameSession(gameId) {
    if (!this.isConnected) return null;

    try {
      const { data, error } = await this.supabase
        .from('game_sessions')
        .select(`
          *,
          game_players (*)
        `)
        .eq('game_id', gameId)
        .neq('status', 'finished')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('❌ Failed to get game session:', error.message);
      return null;
    }
  }

  async updateGameSession(gameId, updateData) {
    if (!this.isConnected) return null;

    try {
      const { data, error } = await this.supabase
        .from('game_sessions')
        .update(updateData)
        .eq('game_id', gameId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Failed to update game session:', error.message);
      return null;
    }
  }

  async addPlayerToGame(gameId, playerData) {
    if (!this.isConnected) return null;

    try {
      // First get the game session to get its ID
      const { data: gameSession, error: gameError } = await this.supabase
        .from('game_sessions')
        .select('id')
        .eq('game_id', gameId)
        .single();

      if (gameError) throw gameError;

      // Add player to game_players table
      const { data, error } = await this.supabase
        .from('game_players')
        .insert([{
          game_session_id: gameSession.id,
          wallet_address: playerData.walletAddress.toLowerCase(),
          player_name: playerData.playerName,
          vault_balance: playerData.vaultBalance || "0"
        }])
        .select()
        .single();

      if (error) throw error;

      // Update game session pumper count
      await this.supabase
        .from('game_sessions')
        .update({
          game_state: {
            ...gameSession.game_state,
            pumperCount: (gameSession.game_state?.pumperCount || 0) + 1
          }
        })
        .eq('id', gameSession.id);

      return data;
    } catch (error) {
      console.error('❌ Failed to add player to game:', error.message);
      return null;
    }
  }

  async endGameSession(gameId, winnerData, rewardsData) {
    if (!this.isConnected) return null;

    try {
      const { data, error } = await this.supabase
        .from('game_sessions')
        .update({
          status: 'finished',
          end_time: new Date().toISOString(),
          winner: winnerData,
          rewards: rewardsData
        })
        .eq('game_id', gameId)
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Ended game session: ${gameId}`);
      return data;
    } catch (error) {
      console.error('❌ Failed to end game session:', error.message);
      return null;
    }
  }

  // Blockchain Data Caching
  async cacheBlockchainData(key, data, ttlSeconds = 300) {
    if (!this.isConnected) return;

    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

      const { error } = await this.supabase
        .from('blockchain_cache')
        .upsert({
          cache_key: key,
          data: data,
          expires_at: expiresAt,
          last_updated: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('❌ Failed to cache blockchain data:', error.message);
    }
  }

  async getCachedBlockchainData(key) {
    if (!this.isConnected) return null;

    try {
      const { data, error } = await this.supabase
        .from('blockchain_cache')
        .select('data, expires_at')
        .eq('cache_key', key)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data && new Date(data.expires_at) > new Date()) {
        return data.data;
      }

      // Cache miss or expired - clean up
      if (data) {
        await this.supabase
          .from('blockchain_cache')
          .delete()
          .eq('cache_key', key);
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to get cached blockchain data:', error.message);
      return null;
    }
  }

  // User Action Logging
  async logUserAction(sessionId, walletAddress, action, data = {}) {
    if (!this.isConnected) return;

    try {
      const { error } = await this.supabase
        .from('user_actions')
        .insert([{
          session_id: sessionId,
          wallet_address: walletAddress.toLowerCase(),
          action: action,
          amount: data.amount,
          transaction_hash: data.transactionHash,
          metadata: data.metadata || {},
          ip_address: data.ipAddress,
          user_agent: data.userAgent
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('❌ Failed to log user action:', error.message);
    }
  }

  // Analytics and Statistics
  async getUserStats(walletAddress) {
    if (!this.isConnected) {
      return { totalSessions: 0, activeSessions: 0, avgSessionDuration: 0 };
    }

    try {
      const { data, error } = await this.supabase
        .rpc('get_user_stats', { wallet_addr: walletAddress.toLowerCase() });

      if (error) throw error;
      return data || { totalSessions: 0, activeSessions: 0, avgSessionDuration: 0 };
    } catch (error) {
      console.error('❌ Failed to get user stats:', error.message);
      return { totalSessions: 0, activeSessions: 0, avgSessionDuration: 0 };
    }
  }

  async getGameStats() {
    if (!this.isConnected) {
      return {
        totalGames: 0,
        activeGames: 0,
        completedGames: 0,
        totalPlayers: 0,
        avgGameDuration: 0
      };
    }

    try {
      const { data, error } = await this.supabase
        .rpc('get_game_stats');

      if (error) throw error;
      return data || {
        totalGames: 0,
        activeGames: 0,
        completedGames: 0,
        totalPlayers: 0,
        avgGameDuration: 0
      };
    } catch (error) {
      console.error('❌ Failed to get game stats:', error.message);
      return {
        totalGames: 0,
        activeGames: 0,
        completedGames: 0,
        totalPlayers: 0,
        avgGameDuration: 0
      };
    }
  }

  // Real-time subscriptions for live game updates
  subscribeToGameUpdates(gameId, callback) {
    if (!this.isConnected) return null;

    return this.supabase
      .channel(`game_${gameId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `game_id=eq.${gameId}`
        },
        callback
      )
      .subscribe();
  }

  subscribeToPlayerUpdates(walletAddress, callback) {
    if (!this.isConnected) return null;

    return this.supabase
      .channel(`player_${walletAddress}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_sessions',
          filter: `wallet_address=eq.${walletAddress.toLowerCase()}`
        },
        callback
      )
      .subscribe();
  }

  // Token Management
  async getTokenBalance(sessionId) {
    if (!this.isConnected) return "0";

    try {
      const { data, error } = await this.supabase
        .from('user_sessions')
        .select('token_balance')
        .eq('session_id', sessionId)
        .single();

      if (error) throw error;
      return data?.token_balance || "0";
    } catch (error) {
      console.error('❌ Failed to get token balance:', error.message);
      return "0";
    }
  }

  async updateTokenBalance(sessionId, newBalance, reason = 'update') {
    if (!this.isConnected) return null;

    try {
      const { data, error } = await this.supabase
        .from('user_sessions')
        .update({
          token_balance: newBalance.toString(),
          last_activity: new Date().toISOString()
        })
        .eq('session_id', sessionId)
        .select()
        .single();

      if (error) throw error;

      // Log the token transaction
      await this.logUserAction(sessionId, data.wallet_address, reason, {
        newBalance: newBalance.toString(),
        previousBalance: data.token_balance
      });

      return data;
    } catch (error) {
      console.error('❌ Failed to update token balance:', error.message);
      return null;
    }
  }

  async depositTokens(sessionId, amount) {
    if (!this.isConnected) return null;

    try {
      const currentBalance = parseFloat(await this.getTokenBalance(sessionId));
      const depositAmount = parseFloat(amount);
      const newBalance = currentBalance + depositAmount;

      return await this.updateTokenBalance(sessionId, newBalance, 'deposit_tokens');
    } catch (error) {
      console.error('❌ Failed to deposit tokens:', error.message);
      return null;
    }
  }

  async withdrawTokens(sessionId, amount) {
    if (!this.isConnected) return null;

    try {
      const currentBalance = parseFloat(await this.getTokenBalance(sessionId));
      const withdrawAmount = parseFloat(amount);

      if (currentBalance < withdrawAmount) {
        throw new Error('Insufficient token balance');
      }

      const newBalance = currentBalance - withdrawAmount;
      return await this.updateTokenBalance(sessionId, newBalance, 'withdraw_tokens');
    } catch (error) {
      console.error('❌ Failed to withdraw tokens:', error.message);
      return null;
    }
  }

  async spendTokens(sessionId, amount) {
    if (!this.isConnected) return null;

    try {
      const currentBalance = parseFloat(await this.getTokenBalance(sessionId));
      const spendAmount = parseFloat(amount);

      if (currentBalance < spendAmount) {
        throw new Error('Insufficient token balance');
      }

      const newBalance = currentBalance - spendAmount;
      return await this.updateTokenBalance(sessionId, newBalance, 'spend_tokens');
    } catch (error) {
      console.error('❌ Failed to spend tokens:', error.message);
      return null;
    }
  }

  async awardTokens(sessionId, amount, reason = 'game_reward') {
    if (!this.isConnected) return null;

    try {
      const currentBalance = parseFloat(await this.getTokenBalance(sessionId));
      const awardAmount = parseFloat(amount);
      const newBalance = currentBalance + awardAmount;

      return await this.updateTokenBalance(sessionId, newBalance, reason);
    } catch (error) {
      console.error('❌ Failed to award tokens:', error.message);
      return null;
    }
  }

  // Cleanup old data
  async cleanupOldData(daysOld = 30) {
    if (!this.isConnected) return;

    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();

      // Remove old inactive sessions
      const { error: sessionError } = await this.supabase
        .from('user_sessions')
        .delete()
        .eq('is_active', false)
        .lt('last_activity', cutoffDate);

      if (sessionError) throw sessionError;

      // Remove old user actions
      const { error: actionError } = await this.supabase
        .from('user_actions')
        .delete()
        .lt('created_at', cutoffDate);

      if (actionError) throw actionError;

      // Remove expired cache
      const { error: cacheError } = await this.supabase
        .from('blockchain_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (cacheError) throw cacheError;

      console.log(`✅ Cleaned up old data from Supabase`);
    } catch (error) {
      console.error('❌ Failed to cleanup old data:', error.message);
    }
  }
}

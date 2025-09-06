-- =================================================
-- BNB BALLOON PUMP GAME DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- Project: https://ltxcyxvhflvzqzcipzte.supabase.co
-- =================================================

-- User Sessions Table
CREATE TABLE user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  wallet_address TEXT NOT NULL,
  player_name TEXT NOT NULL,
  token_balance TEXT DEFAULT '1000',
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

-- RLS Policies - Temporarily permissive for development
-- TODO: Implement proper wallet-based authentication later

CREATE POLICY "Allow all operations on user_sessions" ON user_sessions
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on game_sessions" ON game_sessions
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on game_players" ON game_players
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on user_actions" ON user_actions
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on blockchain_cache" ON blockchain_cache
  FOR ALL USING (true);

-- Optional: Create a function for analytics
CREATE OR REPLACE FUNCTION get_user_stats(wallet_addr TEXT)
RETURNS TABLE (
  total_sessions BIGINT,
  active_sessions BIGINT,
  avg_session_duration INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_sessions,
    COUNT(CASE WHEN is_active THEN 1 END)::BIGINT as active_sessions,
    AVG(EXTRACT(EPOCH FROM (last_activity - session_start)))::INTERVAL as avg_session_duration
  FROM user_sessions
  WHERE wallet_address = wallet_addr;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a function for game stats
CREATE OR REPLACE FUNCTION get_game_stats()
RETURNS TABLE (
  total_games BIGINT,
  active_games BIGINT,
  completed_games BIGINT,
  total_players BIGINT,
  avg_game_duration INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_games,
    COUNT(CASE WHEN status = 'active' THEN 1 END)::BIGINT as active_games,
    COUNT(CASE WHEN status = 'finished' THEN 1 END)::BIGINT as completed_games,
    COALESCE(SUM((game_state->>'pumperCount')::INTEGER), 0)::BIGINT as total_players,
    AVG(EXTRACT(EPOCH FROM (end_time - start_time)))::INTERVAL as avg_game_duration
  FROM game_sessions;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT '🎉 Database schema created successfully!' as message;

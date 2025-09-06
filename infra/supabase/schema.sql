-- Supabase Database Schema for BNB Balloon Pump Game
-- Run this in Supabase SQL Editor to set up the database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES TABLE (SIWE Authentication)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evm_address TEXT UNIQUE NOT NULL,
  ens_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- =============================================
-- DEPOSITS TABLE (Confirmed On-Chain Deposits)
-- =============================================
CREATE TABLE IF NOT EXISTS public.deposits (
  tx TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  round_id BIGINT,
  confirmed BOOLEAN DEFAULT false,
  chain_slot BIGINT,
  block_number BIGINT,
  block_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deposits
CREATE POLICY "Users can view own deposits" ON public.deposits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can insert deposits" ON public.deposits
  FOR INSERT WITH CHECK (true); -- Allow service role

CREATE POLICY "Service can update deposits" ON public.deposits
  FOR UPDATE USING (true); -- Allow service role

-- =============================================
-- PUMPS TABLE (Client Requests → Relayer)
-- =============================================
CREATE TABLE IF NOT EXISTS public.pumps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  round_id BIGINT NOT NULL,
  token TEXT NOT NULL,
  spend NUMERIC NOT NULL CHECK (spend > 0),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  relayed_tx TEXT,
  relayed_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('queued', 'sent', 'confirmed', 'failed')) DEFAULT 'queued',
  error_message TEXT,
  gas_used BIGINT,
  gas_price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pumps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pumps
CREATE POLICY "Users can view own pumps" ON public.pumps
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pumps" ON public.pumps
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can update pumps" ON public.pumps
  FOR UPDATE USING (true); -- Allow service role

-- =============================================
-- ROUNDS_CACHE TABLE (Real-time UI Cache)
-- =============================================
CREATE TABLE IF NOT EXISTS public.rounds_cache (
  round_id BIGINT PRIMARY KEY,
  status TEXT CHECK (status IN ('OPEN', 'POPPED', 'SETTLED')) NOT NULL DEFAULT 'OPEN',
  pressure NUMERIC NOT NULL DEFAULT 0,
  pot NUMERIC NOT NULL DEFAULT 0,
  threshold NUMERIC,
  last1 TEXT, -- wallet addresses
  last2 TEXT,
  last3 TEXT,
  opened_at TIMESTAMPTZ,
  popped_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  total_pumps BIGINT DEFAULT 0,
  total_players BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.rounds_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rounds_cache (public read)
CREATE POLICY "Anyone can view rounds cache" ON public.rounds_cache
  FOR SELECT USING (true);

CREATE POLICY "Service can insert/update rounds cache" ON public.rounds_cache
  FOR ALL USING (true); -- Allow service role

-- =============================================
-- LEADERBOARD TABLE (Player Statistics)
-- =============================================
CREATE TABLE IF NOT EXISTS public.leaderboard (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  net_winnings NUMERIC DEFAULT 0,
  total_deposited NUMERIC DEFAULT 0,
  total_withdrawn NUMERIC DEFAULT 0,
  total_pumps BIGINT DEFAULT 0,
  successful_pumps BIGINT DEFAULT 0,
  pops_triggered BIGINT DEFAULT 0,
  rounds_won BIGINT DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  avg_pump_size NUMERIC DEFAULT 0,
  largest_win NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leaderboard (public read)
CREATE POLICY "Anyone can view leaderboard" ON public.leaderboard
  FOR SELECT USING (true);

CREATE POLICY "Service can update leaderboard" ON public.leaderboard
  FOR ALL USING (true); -- Allow service role

-- =============================================
-- USER_SESSIONS TABLE (Session Management)
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  evm_address TEXT NOT NULL,
  player_name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  session_start TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_sessions
CREATE POLICY "Users can view own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- WEBHOOKS TABLE (Event Processing)
-- =============================================
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webhooks (service only)
CREATE POLICY "Service can manage webhooks" ON public.webhooks
  FOR ALL USING (true); -- Allow service role only

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_evm_address ON public.profiles(evm_address);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at);

-- Deposits indexes
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON public.deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_round_id ON public.deposits(round_id);
CREATE INDEX IF NOT EXISTS idx_deposits_confirmed ON public.deposits(confirmed);
CREATE INDEX IF NOT EXISTS idx_deposits_created_at ON public.deposits(created_at);

-- Pumps indexes
CREATE INDEX IF NOT EXISTS idx_pumps_user_id ON public.pumps(user_id);
CREATE INDEX IF NOT EXISTS idx_pumps_round_id ON public.pumps(round_id);
CREATE INDEX IF NOT EXISTS idx_pumps_status ON public.pumps(status);
CREATE INDEX IF NOT EXISTS idx_pumps_requested_at ON public.pumps(requested_at);
CREATE INDEX IF NOT EXISTS idx_pumps_relayed_tx ON public.pumps(relayed_tx);

-- Rounds cache indexes
CREATE INDEX IF NOT EXISTS idx_rounds_cache_status ON public.rounds_cache(status);
CREATE INDEX IF NOT EXISTS idx_rounds_cache_updated_at ON public.rounds_cache(updated_at);

-- Leaderboard indexes
CREATE INDEX IF NOT EXISTS idx_leaderboard_net_winnings ON public.leaderboard(net_winnings DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_total_pumps ON public.leaderboard(total_pumps DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_updated_at ON public.leaderboard(updated_at);

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON public.user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON public.user_sessions(last_activity);

-- Webhooks indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_topic ON public.webhooks(topic);
CREATE INDEX IF NOT EXISTS idx_webhooks_processed ON public.webhooks(processed);
CREATE INDEX IF NOT EXISTS idx_webhooks_created_at ON public.webhooks(created_at);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rounds_cache_updated_at BEFORE UPDATE ON public.rounds_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON public.user_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update leaderboard stats
CREATE OR REPLACE FUNCTION update_leaderboard_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update leaderboard entry
  INSERT INTO public.leaderboard (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Update stats based on pump data
  UPDATE public.leaderboard
  SET
    total_pumps = total_pumps + 1,
    updated_at = NOW()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for leaderboard updates
CREATE TRIGGER trigger_update_leaderboard
  AFTER INSERT ON public.pumps
  FOR EACH ROW
  EXECUTE FUNCTION update_leaderboard_stats();

-- =============================================
-- VIEWS FOR ANALYTICS
-- =============================================

-- Daily statistics view
CREATE OR REPLACE VIEW daily_stats AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_pumps,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(spend) as total_volume,
  AVG(spend) as avg_pump_size
FROM public.pumps
WHERE status = 'confirmed'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Round statistics view
CREATE OR REPLACE VIEW round_stats AS
SELECT
  round_id,
  COUNT(*) as pump_count,
  COUNT(DISTINCT user_id) as player_count,
  SUM(spend) as total_volume,
  AVG(spend) as avg_pump_size,
  MIN(requested_at) as first_pump,
  MAX(requested_at) as last_pump
FROM public.pumps
WHERE status = 'confirmed'
GROUP BY round_id
ORDER BY round_id DESC;

-- =============================================
-- INITIAL DATA SEEDING
-- =============================================

-- Insert initial round if not exists
INSERT INTO public.rounds_cache (round_id, status, threshold, opened_at)
VALUES (1, 'OPEN', 10000, NOW())
ON CONFLICT (round_id) DO NOTHING;

-- =============================================
-- GRANTS FOR SERVICE ROLE
-- =============================================

-- Grant necessary permissions to service role (handled by Supabase automatically)
-- These are just for reference - Supabase handles this internally

/*
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.deposits TO service_role;
GRANT ALL ON public.pumps TO service_role;
GRANT ALL ON public.rounds_cache TO service_role;
GRANT ALL ON public.leaderboard TO service_role;
GRANT ALL ON public.user_sessions TO service_role;
GRANT ALL ON public.webhooks TO service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
*/

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE public.profiles IS 'User profiles linked to EVM addresses for SIWE authentication';
COMMENT ON TABLE public.deposits IS 'Confirmed on-chain deposit transactions';
COMMENT ON TABLE public.pumps IS 'Pump requests from clients to relayer service';
COMMENT ON TABLE public.rounds_cache IS 'Real-time cache of round state for UI updates';
COMMENT ON TABLE public.leaderboard IS 'Player statistics and rankings';
COMMENT ON TABLE public.user_sessions IS 'User session management and activity tracking';
COMMENT ON TABLE public.webhooks IS 'Event processing queue for indexer service';

COMMENT ON VIEW daily_stats IS 'Daily aggregated statistics for analytics';
COMMENT ON VIEW round_stats IS 'Per-round aggregated statistics';

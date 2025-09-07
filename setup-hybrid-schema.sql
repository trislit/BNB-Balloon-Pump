-- =================================================
-- HYBRID MODE DATABASE SCHEMA
-- Supports both test mode and production blockchain
-- =================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USER MANAGEMENT
-- =============================================

-- User profiles with both test tokens and blockchain tracking
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evm_address TEXT UNIQUE NOT NULL,
  ens_name TEXT,
  test_tokens TEXT DEFAULT '1000', -- For test mode
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TRANSACTION TRACKING
-- =============================================

-- Token transactions (test mode and blockchain)
CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdraw', 'pump', 'reward')),
  amount TEXT NOT NULL,
  round_id INTEGER,
  tx_hash TEXT, -- Blockchain transaction hash (null for test mode)
  block_number INTEGER, -- Blockchain block number (null for test mode)
  is_test_mode BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pump requests and confirmations
CREATE TABLE IF NOT EXISTS pumps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  session_id TEXT,
  round_id TEXT NOT NULL,
  token TEXT NOT NULL,
  spend TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'optimistic', 'sent', 'confirmed', 'failed', 'blockchain_failed')),
  relayed_tx TEXT,
  block_number INTEGER,
  gas_used TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deposits (blockchain confirmed)
CREATE TABLE IF NOT EXISTS deposits (
  tx TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  amount TEXT NOT NULL,
  round_id TEXT NOT NULL,
  confirmed BOOLEAN DEFAULT false,
  block_number INTEGER,
  log_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- GAME STATE MANAGEMENT
-- =============================================

-- Real-time game rounds cache
CREATE TABLE IF NOT EXISTS rounds_cache (
  round_id INTEGER PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  pressure TEXT DEFAULT '0',
  pot TEXT DEFAULT '0',
  last1 TEXT, -- Last pumper addresses
  last2 TEXT,
  last3 TEXT,
  winner TEXT, -- Winner address when round ends
  final_reward TEXT, -- Final reward amount
  last_block INTEGER, -- Last blockchain block processed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard
CREATE TABLE IF NOT EXISTS leaderboard (
  user_id TEXT PRIMARY KEY,
  net_winnings TEXT DEFAULT '0',
  total_deposited TEXT DEFAULT '0',
  total_pumps INTEGER DEFAULT 0,
  pops_triggered INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXER STATE MANAGEMENT
-- =============================================

-- Indexer state tracking
CREATE TABLE IF NOT EXISTS indexer_state (
  id TEXT PRIMARY KEY,
  last_block INTEGER NOT NULL,
  last_tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_profiles_address ON profiles(evm_address);
CREATE INDEX IF NOT EXISTS idx_token_transactions_user ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_token_transactions_test_mode ON token_transactions(is_test_mode);

CREATE INDEX IF NOT EXISTS idx_pumps_user_id ON pumps(user_id);
CREATE INDEX IF NOT EXISTS idx_pumps_status ON pumps(status);
CREATE INDEX IF NOT EXISTS idx_pumps_round_id ON pumps(round_id);
CREATE INDEX IF NOT EXISTS idx_pumps_tx ON pumps(relayed_tx);

CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_confirmed ON deposits(confirmed);
CREATE INDEX IF NOT EXISTS idx_deposits_round_id ON deposits(round_id);

CREATE INDEX IF NOT EXISTS idx_rounds_cache_status ON rounds_cache(status);
CREATE INDEX IF NOT EXISTS idx_rounds_cache_updated ON rounds_cache(updated_at);

CREATE INDEX IF NOT EXISTS idx_leaderboard_winnings ON leaderboard(net_winnings DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_pumps ON leaderboard(total_pumps DESC);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indexer_state ENABLE ROW LEVEL SECURITY;

-- Permissive policies for development (replace with proper RLS in production)
CREATE POLICY "Allow all operations on profiles" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Allow all operations on token_transactions" ON public.token_transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations on pumps" ON public.pumps FOR ALL USING (true);
CREATE POLICY "Allow all operations on deposits" ON public.deposits FOR ALL USING (true);
CREATE POLICY "Allow all operations on rounds_cache" ON public.rounds_cache FOR ALL USING (true);
CREATE POLICY "Allow all operations on leaderboard" ON public.leaderboard FOR ALL USING (true);
CREATE POLICY "Allow all operations on indexer_state" ON public.indexer_state FOR ALL USING (true);

-- =============================================
-- TRIGGERS AND FUNCTIONS
-- =============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pumps_updated_at BEFORE UPDATE ON pumps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rounds_cache_updated_at BEFORE UPDATE ON rounds_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaderboard_updated_at BEFORE UPDATE ON leaderboard
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_indexer_state_updated_at BEFORE UPDATE ON indexer_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- HYBRID MODE FUNCTIONS
-- =============================================

-- Function to transfer test tokens (test mode)
CREATE OR REPLACE FUNCTION transfer_test_tokens(
  from_address TEXT,
  to_address TEXT,
  amount TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  from_balance TEXT;
  to_balance TEXT;
  new_from_balance TEXT;
  new_to_balance TEXT;
BEGIN
  -- Get current balances
  SELECT COALESCE(test_tokens, '0') INTO from_balance FROM profiles WHERE evm_address = from_address;
  SELECT COALESCE(test_tokens, '0') INTO to_balance FROM profiles WHERE evm_address = to_address;

  -- Check if sender has enough tokens
  IF CAST(from_balance AS DECIMAL) < CAST(amount AS DECIMAL) THEN
    RETURN FALSE;
  END IF;

  -- Calculate new balances
  new_from_balance := CAST(CAST(from_balance AS DECIMAL) - CAST(amount AS DECIMAL) AS TEXT);
  new_to_balance := CAST(CAST(to_balance AS DECIMAL) + CAST(amount AS DECIMAL) AS TEXT);

  -- Update balances
  UPDATE profiles SET test_tokens = new_from_balance WHERE evm_address = from_address;
  UPDATE profiles SET test_tokens = new_to_balance WHERE evm_address = to_address;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to simulate pump (hybrid mode)
CREATE OR REPLACE FUNCTION simulate_pump_hybrid(
  user_address TEXT,
  pump_amount TEXT,
  is_test BOOLEAN DEFAULT true
) RETURNS TABLE(
  success BOOLEAN,
  new_pressure TEXT,
  new_pot TEXT,
  balloon_popped BOOLEAN,
  winner_reward TEXT
) AS $$
DECLARE
  current_pressure DECIMAL;
  current_pot DECIMAL;
  pump_value DECIMAL;
  new_pressure_val DECIMAL;
  new_pot_val DECIMAL;
  pressure_increase DECIMAL;
  pot_contribution DECIMAL;
  popped BOOLEAN := FALSE;
  winner_reward_val DECIMAL := 0;
BEGIN
  -- Get current round state
  SELECT CAST(COALESCE(pressure, '0') AS DECIMAL), CAST(COALESCE(pot, '0') AS DECIMAL)
  INTO current_pressure, current_pot
  FROM rounds_cache WHERE round_id = 1;

  -- Calculate pump effects
  pump_value := CAST(pump_amount AS DECIMAL);
  pressure_increase := pump_value / 10; -- 1/10th of pump amount adds to pressure
  pot_contribution := pump_value * 0.1; -- 10% goes to pot
  
  new_pressure_val := current_pressure + pressure_increase;
  new_pot_val := current_pot + pot_contribution;

  -- Check if balloon pops (>100 pressure)
  IF new_pressure_val > 100 THEN
    popped := TRUE;
    winner_reward_val := new_pot_val * 0.85; -- 85% to winner
    
    -- Award winner (only in test mode)
    IF is_test THEN
      UPDATE profiles 
      SET test_tokens = CAST(CAST(COALESCE(test_tokens, '0') AS DECIMAL) + winner_reward_val AS TEXT)
      WHERE evm_address = user_address;
    END IF;
    
    -- Reset round
    UPDATE rounds_cache SET
      pressure = '0',
      pot = '0',
      last1 = NULL,
      last2 = NULL,
      last3 = NULL,
      winner = user_address,
      final_reward = CAST(winner_reward_val AS TEXT),
      status = 'active' -- Immediately start new round
    WHERE round_id = 1;
    
    new_pressure_val := 0;
    new_pot_val := 0;
  ELSE
    -- Update round state
    UPDATE rounds_cache SET
      pressure = CAST(new_pressure_val AS TEXT),
      pot = CAST(new_pot_val AS TEXT),
      last3 = last2,
      last2 = last1,
      last1 = user_address
    WHERE round_id = 1;
  END IF;

  -- Return results
  RETURN QUERY SELECT 
    TRUE as success,
    CAST(new_pressure_val AS TEXT) as new_pressure,
    CAST(new_pot_val AS TEXT) as new_pot,
    popped as balloon_popped,
    CAST(winner_reward_val AS TEXT) as winner_reward;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- INITIAL DATA
-- =============================================

-- Create initial round
INSERT INTO rounds_cache (round_id, status, pressure, pot) 
VALUES (1, 'active', '0', '0') 
ON CONFLICT (round_id) DO NOTHING;

-- Create initial indexer state
INSERT INTO indexer_state (id, last_block) 
VALUES ('balloon_pump_indexer', 0) 
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- VERIFICATION QUERY
-- =============================================

SELECT 'Hybrid schema setup complete!' as message,
       (SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('profiles', 'pumps', 'rounds_cache', 'deposits', 'leaderboard', 'indexer_state')
       ) as tables_created;

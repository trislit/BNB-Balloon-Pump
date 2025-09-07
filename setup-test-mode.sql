-- =================================================
-- TEST MODE DATABASE SCHEMA
-- Works without smart contract - pure Supabase
-- =================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TEST MODE TABLES
-- =============================================

-- User profiles with test token balances
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evm_address TEXT UNIQUE NOT NULL,
  ens_name TEXT,
  test_tokens TEXT DEFAULT '1000', -- Starting test tokens
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test token transactions (like blockchain transactions)
CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdraw', 'pump', 'reward')),
  amount TEXT NOT NULL,
  round_id BIGINT DEFAULT 1,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES profiles(evm_address) ON DELETE CASCADE
);

-- Pump actions for test mode (simulated blockchain)
CREATE TABLE IF NOT EXISTS test_pumps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  round_id BIGINT DEFAULT 1,
  pump_amount TEXT NOT NULL,
  pressure_before TEXT,
  pressure_after TEXT,
  pot_before TEXT,
  pot_after TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES profiles(evm_address) ON DELETE CASCADE
);

-- Game state cache for real-time updates
CREATE TABLE IF NOT EXISTS rounds_cache (
  round_id BIGINT PRIMARY KEY,
  status TEXT DEFAULT 'active',
  pressure TEXT DEFAULT '0',
  pot TEXT DEFAULT '0',
  last1 TEXT,
  last2 TEXT,
  last3 TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard for test mode
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  total_pumps INTEGER DEFAULT 0,
  total_rewards TEXT DEFAULT '0',
  net_winnings TEXT DEFAULT '0',
  pops_triggered INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES profiles(evm_address) ON DELETE CASCADE,
  UNIQUE(user_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_profiles_address ON profiles(evm_address);
CREATE INDEX IF NOT EXISTS idx_token_transactions_user ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_pumps_user ON test_pumps(user_id);
CREATE INDEX IF NOT EXISTS idx_test_pumps_round ON test_pumps(round_id);
CREATE INDEX IF NOT EXISTS idx_rounds_cache_updated ON rounds_cache(updated_at);
CREATE INDEX IF NOT EXISTS idx_leaderboard_winnings ON leaderboard(net_winnings DESC);

-- =============================================
-- TRIGGER FOR UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rounds_cache_updated_at BEFORE UPDATE ON rounds_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaderboard_updated_at BEFORE UPDATE ON leaderboard
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INITIAL TEST DATA
-- =============================================

-- Create initial round
INSERT INTO rounds_cache (round_id, status, pressure, pot)
VALUES (1, 'active', '0', '0')
ON CONFLICT (round_id) DO NOTHING;

-- =============================================
-- TEST MODE FUNCTIONS
-- =============================================

-- Function to simulate token transfer
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

-- Function to simulate pump action
CREATE OR REPLACE FUNCTION simulate_pump(
  user_address TEXT,
  pump_amount TEXT
) RETURNS JSON AS $$
DECLARE
  current_pressure TEXT;
  new_pressure TEXT;
  pot_increase TEXT;
  result JSON;
BEGIN
  -- Get current pressure
  SELECT COALESCE(pressure, '0') INTO current_pressure
  FROM rounds_cache WHERE round_id = 1;

  -- Calculate new pressure (simple simulation)
  new_pressure := CAST(CAST(current_pressure AS DECIMAL) + CAST(pump_amount AS DECIMAL) AS TEXT);

  -- Calculate pot increase (10% of pump amount)
  pot_increase := CAST(CAST(pump_amount AS DECIMAL) * 0.1 AS TEXT);

  -- Update round state
  UPDATE rounds_cache
  SET pressure = new_pressure,
      pot = CAST(CAST(COALESCE(pot, '0') AS DECIMAL) + CAST(pot_increase AS DECIMAL) AS TEXT),
      last3 = last2,
      last2 = last1,
      last1 = user_address,
      updated_at = NOW()
  WHERE round_id = 1;

  -- Record the pump action
  INSERT INTO test_pumps (user_id, round_id, pump_amount, pressure_before, pressure_after)
  VALUES (user_address, 1, pump_amount, current_pressure, new_pressure);

  -- Check if balloon should pop (pressure > 100)
  IF CAST(new_pressure AS DECIMAL) > 100 THEN
    -- Simulate pop and reset
    PERFORM simulate_balloon_pop();
  END IF;

  -- Return result
  result := json_build_object(
    'success', true,
    'new_pressure', new_pressure,
    'pump_amount', pump_amount,
    'pot_increase', pot_increase
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to simulate balloon pop
CREATE OR REPLACE FUNCTION simulate_balloon_pop() RETURNS VOID AS $$
DECLARE
  current_pot TEXT;
  winner_address TEXT;
  winner_reward TEXT;
BEGIN
  -- Get current pot
  SELECT COALESCE(pot, '0') INTO current_pot FROM rounds_cache WHERE round_id = 1;

  -- Get last pumper as "winner"
  SELECT COALESCE(last1, '') INTO winner_address FROM rounds_cache WHERE round_id = 1;

  -- Calculate winner reward (85% of pot)
  winner_reward := CAST(CAST(current_pot AS DECIMAL) * 0.85 AS TEXT);

  -- Award winner if there's a winner and pot
  IF winner_address != '' AND CAST(current_pot AS DECIMAL) > 0 THEN
    -- Add reward to winner's balance
    UPDATE profiles
    SET test_tokens = CAST(CAST(COALESCE(test_tokens, '0') AS DECIMAL) + CAST(winner_reward AS DECIMAL) AS TEXT)
    WHERE evm_address = winner_address;

    -- Record reward transaction
    INSERT INTO token_transactions (user_id, transaction_type, amount, round_id)
    VALUES (winner_address, 'reward', winner_reward, 1);

    -- Update leaderboard
    INSERT INTO leaderboard (user_id, total_rewards, pops_triggered)
    VALUES (winner_address, winner_reward, 1)
    ON CONFLICT (user_id) DO UPDATE SET
      total_rewards = CAST(CAST(COALESCE(leaderboard.total_rewards, '0') AS DECIMAL) + CAST(winner_reward AS DECIMAL) AS TEXT),
      pops_triggered = leaderboard.pops_triggered + 1,
      updated_at = NOW();
  END IF;

  -- Reset round
  UPDATE rounds_cache
  SET pressure = '0',
      pot = '0',
      last1 = NULL,
      last2 = NULL,
      last3 = NULL,
      updated_at = NOW()
  WHERE round_id = 1;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

SELECT 'Test mode setup completed successfully!' as status;
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN '✅ profiles table ready'
    ELSE '❌ profiles table missing'
  END as profiles_check,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'test_pumps') THEN '✅ test_pumps table ready'
    ELSE '❌ test_pumps table missing'
  END as test_pumps_check,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rounds_cache') THEN '✅ rounds_cache table ready'
    ELSE '❌ rounds_cache table missing'
  END as rounds_cache_check,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'token_transactions') THEN '✅ token_transactions table ready'
    ELSE '❌ token_transactions table missing'
  END as token_transactions_check;

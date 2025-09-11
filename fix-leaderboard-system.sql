-- Fix Leaderboard System - Track Historical Data
-- This ensures we keep past game data for a working leaderboard

-- 1. First, let's ensure we have a proper leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
  user_id TEXT PRIMARY KEY,
  nickname TEXT,
  total_pumps INTEGER DEFAULT 0,
  total_winnings TEXT DEFAULT '0',
  net_winnings TEXT DEFAULT '0', -- total_winnings - total_deposited
  total_deposited TEXT DEFAULT '0',
  pops_triggered INTEGER DEFAULT 0,
  last_pump_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to existing leaderboard table if they don't exist
DO $$ 
BEGIN
    -- Add total_winnings column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leaderboard' AND column_name = 'total_winnings') THEN
        ALTER TABLE leaderboard ADD COLUMN total_winnings TEXT DEFAULT '0';
    END IF;
    
    -- Add net_winnings column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leaderboard' AND column_name = 'net_winnings') THEN
        ALTER TABLE leaderboard ADD COLUMN net_winnings TEXT DEFAULT '0';
    END IF;
    
    -- Add total_deposited column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leaderboard' AND column_name = 'total_deposited') THEN
        ALTER TABLE leaderboard ADD COLUMN total_deposited TEXT DEFAULT '0';
    END IF;
    
    -- Add pops_triggered column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leaderboard' AND column_name = 'pops_triggered') THEN
        ALTER TABLE leaderboard ADD COLUMN pops_triggered INTEGER DEFAULT 0;
    END IF;
    
    -- Add last_pump_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leaderboard' AND column_name = 'last_pump_at') THEN
        ALTER TABLE leaderboard ADD COLUMN last_pump_at TIMESTAMPTZ;
    END IF;
    
    -- Add nickname column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leaderboard' AND column_name = 'nickname') THEN
        ALTER TABLE leaderboard ADD COLUMN nickname TEXT;
    END IF;
END $$;

-- 2. Create a historical rounds table to keep past game data
CREATE TABLE IF NOT EXISTS historical_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id TEXT NOT NULL,
  status TEXT NOT NULL,
  pressure TEXT NOT NULL,
  pot TEXT NOT NULL,
  winner TEXT,
  second_place TEXT,
  third_place TEXT,
  total_pumps INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create a user_stats table for detailed tracking
CREATE TABLE IF NOT EXISTS user_stats (
  user_id TEXT PRIMARY KEY,
  total_pumps INTEGER DEFAULT 0,
  total_pumped_amount TEXT DEFAULT '0',
  total_winnings TEXT DEFAULT '0',
  total_deposits TEXT DEFAULT '0',
  pops_triggered INTEGER DEFAULT 0,
  rounds_participated INTEGER DEFAULT 0,
  last_activity TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leaderboard_winnings ON leaderboard(total_winnings DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_pumps ON leaderboard(total_pumps DESC);
CREATE INDEX IF NOT EXISTS idx_historical_rounds_ended ON historical_rounds(ended_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_activity ON user_stats(last_activity DESC);

-- 5. Enable RLS
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- 6. Create policies (drop existing ones first)
DROP POLICY IF EXISTS "Allow all operations on leaderboard" ON public.leaderboard;
DROP POLICY IF EXISTS "Allow all operations on historical_rounds" ON public.historical_rounds;
DROP POLICY IF EXISTS "Allow all operations on user_stats" ON public.user_stats;

CREATE POLICY "Allow all operations on leaderboard" ON public.leaderboard FOR ALL USING (true);
CREATE POLICY "Allow all operations on historical_rounds" ON public.historical_rounds FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_stats" ON public.user_stats FOR ALL USING (true);

-- 7. Update the simulate_pump_working function to track historical data
CREATE OR REPLACE FUNCTION simulate_pump_working(
  user_address TEXT,
  pump_amount TEXT
) RETURNS JSON AS $$
DECLARE
  current_round RECORD;
  new_pressure DECIMAL;
  new_pot DECIMAL;
  pump_amount_decimal DECIMAL;
  should_pop BOOLEAN := false;
  pop_reason TEXT;
  result JSON;
BEGIN
  -- Get current round
  SELECT * INTO current_round FROM rounds_cache WHERE status = 'active' LIMIT 1;
  
  IF current_round IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No active round');
  END IF;

  -- Convert pump amount to decimal
  pump_amount_decimal := pump_amount::DECIMAL;
  
  -- Calculate new pressure and pot - 100% goes to pot
  new_pressure := COALESCE(current_round.pressure::DECIMAL, 0) + pump_amount_decimal;
  new_pot := COALESCE(current_round.pot::DECIMAL, 0) + pump_amount_decimal;
  
  -- Update user stats for this pump
  INSERT INTO user_stats (user_id, total_pumps, total_pumped_amount, last_activity)
  VALUES (user_address, 1, pump_amount_decimal::TEXT, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    total_pumps = user_stats.total_pumps + 1,
    total_pumped_amount = (user_stats.total_pumped_amount::DECIMAL + pump_amount_decimal)::TEXT,
    last_activity = NOW(),
    updated_at = NOW();
  
  -- Random pop logic - exponential increase with pressure
  DECLARE
    random_factor DECIMAL;
    pressure_factor DECIMAL;
    combined_chance DECIMAL;
  BEGIN
    -- Generate random factor (0-1)
    random_factor := random();
    
    -- Pressure factor - exponential increase past 1000
    IF new_pressure <= 1000 THEN
      pressure_factor := new_pressure / 1000.0;
      combined_chance := 0.03 + (pressure_factor * 0.12); -- 3% to 15%
    ELSE
      -- Exponential increase past 1000
      pressure_factor := (new_pressure - 1000) / 1000.0;
      combined_chance := 0.15 + (pressure_factor * pressure_factor * 0.75); -- 15% to 90%
    END IF;
    
    -- Cap the chance at 95%
    combined_chance := LEAST(combined_chance, 0.95);
    
    -- Check if balloon should pop
    should_pop := random_factor < combined_chance;
    pop_reason := CASE 
      WHEN should_pop THEN 'random_chance'
      ELSE 'no_pop'
    END;
  END;
  
  IF should_pop THEN
    -- Balloon popped! Calculate dynamic payouts
    DECLARE
      pressure_ratio DECIMAL;
      winner_pct DECIMAL;
      second_pct DECIMAL;
      third_pct DECIMAL;
      dev_pct DECIMAL;
      burn_pct DECIMAL;
      winner_amount DECIMAL;
      second_amount DECIMAL;
      third_amount DECIMAL;
      dev_amount DECIMAL;
      burn_amount DECIMAL;
    BEGIN
      -- Calculate pressure ratio
      pressure_ratio := GREATEST(0, (new_pressure - 1000) / 1000.0);
      
      -- Dynamic payout calculation
      winner_pct := 0.6 + (pressure_ratio * 0.3); -- 60% to 90%
      second_pct := 0.05 + (pressure_ratio * 0.15); -- 5% to 20%
      third_pct := 0.02 + (pressure_ratio * 0.08); -- 2% to 10%
      dev_pct := 0.25 - (pressure_ratio * 0.15); -- 25% to 10%
      burn_pct := 0.08 - (pressure_ratio * 0.03); -- 8% to 5%
      
      -- Calculate amounts
      winner_amount := new_pot * winner_pct;
      second_amount := new_pot * second_pct;
      third_amount := new_pot * third_pct;
      dev_amount := new_pot * dev_pct;
      burn_amount := new_pot * burn_pct;
      
      -- Save historical round data BEFORE updating current round
      INSERT INTO historical_rounds (
        round_id, status, pressure, pot, winner, second_place, third_place,
        total_pumps, started_at, ended_at
      ) VALUES (
        current_round.round_id,
        'ended',
        new_pressure::TEXT,
        new_pot::TEXT,
        current_round.last1,
        current_round.last2,
        current_round.last3,
        (SELECT COUNT(*) FROM pumps WHERE round_id = current_round.round_id),
        current_round.created_at,
        NOW()
      );
      
      -- Update winner's stats
      IF current_round.last1 IS NOT NULL THEN
        UPDATE user_stats SET
          total_winnings = (total_winnings::DECIMAL + winner_amount)::TEXT,
          pops_triggered = pops_triggered + 1,
          updated_at = NOW()
        WHERE user_id = current_round.last1;
      END IF;
      
      -- Update second place stats
      IF current_round.last2 IS NOT NULL THEN
        UPDATE user_stats SET
          total_winnings = (total_winnings::DECIMAL + second_amount)::TEXT,
          updated_at = NOW()
        WHERE user_id = current_round.last2;
      END IF;
      
      -- Update third place stats
      IF current_round.last3 IS NOT NULL THEN
        UPDATE user_stats SET
          total_winnings = (total_winnings::DECIMAL + third_amount)::TEXT,
          updated_at = NOW()
        WHERE user_id = current_round.last3;
      END IF;
      
      -- Update leaderboard with latest stats
      INSERT INTO leaderboard (user_id, total_pumps, total_winnings, net_winnings, pops_triggered, last_pump_at)
      SELECT 
        us.user_id,
        us.total_pumps,
        us.total_winnings,
        (us.total_winnings::DECIMAL - COALESCE(us.total_deposits::DECIMAL, 0))::TEXT,
        us.pops_triggered,
        us.last_activity
      FROM user_stats us
      WHERE us.user_id IN (current_round.last1, current_round.last2, current_round.last3)
      ON CONFLICT (user_id) DO UPDATE SET
        total_pumps = EXCLUDED.total_pumps,
        total_winnings = EXCLUDED.total_winnings,
        net_winnings = EXCLUDED.net_winnings,
        pops_triggered = EXCLUDED.pops_triggered,
        last_pump_at = EXCLUDED.last_pump_at,
        updated_at = NOW();
      
      -- Update round as ended
      UPDATE rounds_cache SET
        status = 'ended',
        pressure = new_pressure::TEXT,
        pot = new_pot::TEXT,
        winner = current_round.last1,
        updated_at = NOW()
      WHERE round_id = current_round.round_id;
      
      -- Create new round
      INSERT INTO rounds_cache (
        round_id, status, pressure, pot, last1, last2, last3, created_at, updated_at
      ) VALUES (
        (COALESCE(current_round.round_id::INTEGER, 0) + 1)::TEXT,
        'active', '0', '0', NULL, NULL, NULL, NOW(), NOW()
      );
      
      result := json_build_object(
        'success', true,
        'balloon_popped', true,
        'pressure', new_pressure::TEXT,
        'pot', new_pot::TEXT,
        'winner', current_round.last1,
        'winner_amount', winner_amount::TEXT,
        'second_amount', second_amount::TEXT,
        'third_amount', third_amount::TEXT,
        'dev_amount', dev_amount::TEXT,
        'burn_amount', burn_amount::TEXT,
        'pop_reason', pop_reason,
        'game_ended', true
      );
    END;
  ELSE
    -- Normal pump - update round
    UPDATE rounds_cache SET
      pressure = new_pressure::TEXT,
      pot = new_pot::TEXT,
      last3 = current_round.last2,
      last2 = current_round.last1,
      last1 = user_address,
      updated_at = NOW()
    WHERE round_id = current_round.round_id;
    
    result := json_build_object(
      'success', true,
      'balloon_popped', false,
      'pressure', new_pressure::TEXT,
      'pot', new_pot::TEXT,
      'last_pumper', user_address,
      'pop_reason', pop_reason
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 8. Create a function to get leaderboard data
CREATE OR REPLACE FUNCTION get_leaderboard_data(limit_count INTEGER DEFAULT 10)
RETURNS JSON AS $$
DECLARE
  leaderboard_data JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'user_id', l.user_id,
      'nickname', l.nickname,
      'total_pumps', l.total_pumps,
      'total_winnings', l.total_winnings,
      'net_winnings', l.net_winnings,
      'pops_triggered', l.pops_triggered,
      'last_pump_at', l.last_pump_at
    ) ORDER BY l.total_winnings::DECIMAL DESC
  ) INTO leaderboard_data
  FROM (
    SELECT * FROM leaderboard 
    ORDER BY total_winnings::DECIMAL DESC 
    LIMIT limit_count
  ) l;
  
  RETURN COALESCE(leaderboard_data, '[]'::JSON);
END;
$$ LANGUAGE plpgsql;

-- 9. Create a function to get game statistics
CREATE OR REPLACE FUNCTION get_game_statistics()
RETURNS JSON AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_rounds', (SELECT COUNT(*) FROM historical_rounds),
    'active_rounds', (SELECT COUNT(*) FROM rounds_cache WHERE status = 'active'),
    'total_players', (SELECT COUNT(DISTINCT user_id) FROM user_stats),
    'total_pumps', (SELECT SUM(total_pumps) FROM user_stats),
    'total_volume', (SELECT SUM(total_pumped_amount::DECIMAL) FROM user_stats),
    'total_winnings', (SELECT SUM(total_winnings::DECIMAL) FROM user_stats),
    'recent_rounds', (
      SELECT json_agg(
        json_build_object(
          'round_id', round_id,
          'pot', pot,
          'winner', winner,
          'ended_at', ended_at
        ) ORDER BY ended_at DESC
      ) FROM historical_rounds 
      WHERE ended_at IS NOT NULL 
      ORDER BY ended_at DESC 
      LIMIT 5
    )
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- 10. Test the functions
SELECT 'Leaderboard system updated with historical data tracking!' as status;

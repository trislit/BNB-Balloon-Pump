-- Enhanced Game Mechanics with House Pump and Burn Pool
-- This implements the new game mechanics with house pump, first pump split, and burn pool

-- Add burn_pool column to game_rounds table
ALTER TABLE game_rounds ADD COLUMN IF NOT EXISTS burn_pool TEXT DEFAULT '0';
ALTER TABLE game_rounds ADD COLUMN IF NOT EXISTS house_pump_amount TEXT DEFAULT '0';
ALTER TABLE game_rounds ADD COLUMN IF NOT EXISTS pump_count INTEGER DEFAULT 0;

-- Create burn_pool table to track total burned tokens
CREATE TABLE IF NOT EXISTS burn_pool (
  id TEXT PRIMARY KEY DEFAULT 'burn-pool-main',
  total_burned TEXT DEFAULT '0',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial burn pool if it doesn't exist
INSERT INTO burn_pool (id, total_burned) 
VALUES ('burn-pool-main', '0') 
ON CONFLICT (id) DO NOTHING;

-- Enhanced pump function with new mechanics
CREATE OR REPLACE FUNCTION pump_balloon_enhanced(
  user_address TEXT,
  token_address TEXT,
  pump_amount TEXT
) RETURNS JSON AS $$
DECLARE
  current_round RECORD;
  new_pressure DECIMAL;
  new_pot DECIMAL;
  new_burn_pool DECIMAL;
  pump_amount_decimal DECIMAL;
  should_pop BOOLEAN := false;
  pop_chance INTEGER;
  random_roll INTEGER;
  result JSON;
  winnings DECIMAL;
  burn_amount DECIMAL;
  dev_amount DECIMAL;
  winner_amount DECIMAL;
  second_amount DECIMAL;
  third_amount DECIMAL;
  total_pot DECIMAL;
  is_first_pump BOOLEAN := false;
  house_pump_amount DECIMAL;
BEGIN
  -- Get current round
  SELECT * INTO current_round FROM game_rounds 
  WHERE token_address = pump_balloon_enhanced.token_address 
  AND status = 'active' 
  ORDER BY created_at DESC LIMIT 1;
  
  IF current_round IS NULL THEN
    -- Create new round with house pump
    house_pump_amount := pump_amount::DECIMAL;
    
    INSERT INTO game_rounds (
      token_address, 
      status, 
      pressure, 
      pot_amount, 
      burn_pool,
      house_pump_amount,
      pump_count,
      created_at, 
      updated_at
    ) VALUES (
      pump_balloon_enhanced.token_address,
      'active',
      house_pump_amount::TEXT,
      house_pump_amount::TEXT,
      '0',
      house_pump_amount::TEXT,
      0,
      NOW(),
      NOW()
    ) RETURNING * INTO current_round;
    
    -- Log house pump
    RAISE NOTICE 'House pumped % tokens to start round', house_pump_amount;
  END IF;

  -- Convert pump amount to decimal
  pump_amount_decimal := pump_amount::DECIMAL;
  
  -- Check if this is the first player pump
  is_first_pump := (current_round.pump_count = 0);
  
  -- Calculate new pressure and pot
  new_pressure := COALESCE(current_round.pressure::DECIMAL, 0) + pump_amount_decimal;
  new_pot := COALESCE(current_round.pot_amount::DECIMAL, 0) + pump_amount_decimal;
  
  -- No burn on individual pumps - only on final payouts
  burn_amount := 0;
  new_burn_pool := COALESCE(current_round.burn_pool::DECIMAL, 0);
  
  -- Calculate pop chance based on pressure
  pop_chance := LEAST(5 + (new_pressure::INTEGER / 20), 50); -- 5% to 50% max
  
  -- Special case: if first pump, higher chance to pop (encourages risk)
  IF is_first_pump THEN
    pop_chance := pop_chance + 10; -- Add 10% for first pump risk
  END IF;
  
  -- Random roll for pop
  random_roll := (random() * 100)::INTEGER;
  should_pop := random_roll < pop_chance;
  
  IF should_pop THEN
    -- Balloon popped! Calculate payouts
    total_pot := new_pot;
    
    -- Calculate burn amount (5% of total pot on final payout)
    burn_amount := total_pot * 0.05; -- 5% burn on final payout
    
    -- Special payout for first pump pop (50/50 split)
    IF is_first_pump THEN
      winner_amount := total_pot * 0.475; -- 47.5% to winner
      second_amount := 0; -- No second place
      third_amount := 0; -- No third place
      dev_amount := total_pot * 0.475; -- 47.5% to house (dev)
    ELSE
      -- Normal payout structure (more players = better distribution)
      winner_amount := total_pot * 0.65; -- 65% to winner
      second_amount := total_pot * 0.15; -- 15% to second
      third_amount := total_pot * 0.1; -- 10% to third
      dev_amount := total_pot * 0.05; -- 5% to dev
    END IF;
    
    -- Update user balance with winnings
    UPDATE user_balances 
    SET balance = balance + winner_amount,
        total_winnings = total_winnings + winner_amount,
        last_updated = NOW()
    WHERE user_address = pump_balloon_enhanced.user_address 
    AND token_address = pump_balloon_enhanced.token_address;
    
    -- Update round as ended
    UPDATE game_rounds SET
      status = 'ended',
      pressure = new_pressure::TEXT,
      pot_amount = new_pot::TEXT,
      burn_pool = COALESCE(new_burn_pool::TEXT, current_round.burn_pool),
      ended_at = NOW(),
      winner_address = pump_balloon_enhanced.user_address,
      updated_at = NOW()
    WHERE id = current_round.id;
    
    -- Update burn pool
    IF burn_amount > 0 THEN
      UPDATE burn_pool 
      SET total_burned = (total_burned::DECIMAL + burn_amount)::TEXT,
          last_updated = NOW()
      WHERE id = 'burn-pool-main';
    END IF;
    
    -- Record historical game
    INSERT INTO historical_games (
      token_address,
      round_number,
      winner_address,
      final_pressure,
      total_pot,
      winner_payout,
      second_payout,
      third_payout,
      dev_payout,
      burn_amount,
      pump_count,
      ended_at
    ) VALUES (
      pump_balloon_enhanced.token_address,
      current_round.round_number,
      pump_balloon_enhanced.user_address,
      new_pressure,
      total_pot,
      winner_amount,
      second_amount,
      third_amount,
      dev_amount,
      burn_amount,
      current_round.pump_count + 1,
      NOW()
    );
    
    result := json_build_object(
      'success', true,
      'balloon_popped', true,
      'pressure', new_pressure::TEXT,
      'pot', new_pot::TEXT,
      'winner', pump_balloon_enhanced.user_address,
      'winner_amount', winner_amount::TEXT,
      'second_amount', second_amount::TEXT,
      'third_amount', third_amount::TEXT,
      'dev_amount', dev_amount::TEXT,
      'burn_amount', burn_amount::TEXT,
      'is_first_pump_pop', is_first_pump,
      'pump_count', current_round.pump_count + 1,
      'pop_chance', pop_chance
    );
  ELSE
    -- Normal pump - update round
    UPDATE game_rounds SET
      pressure = new_pressure::TEXT,
      pot_amount = new_pot::TEXT,
      burn_pool = COALESCE(new_burn_pool::TEXT, current_round.burn_pool),
      pump_count = pump_count + 1,
      last_pumper = pump_balloon_enhanced.user_address,
      updated_at = NOW()
    WHERE id = current_round.id;
    
    -- No burn pool update on normal pumps
    
    result := json_build_object(
      'success', true,
      'balloon_popped', false,
      'pressure', new_pressure::TEXT,
      'pot', new_pot::TEXT,
      'last_pumper', pump_balloon_enhanced.user_address,
      'pump_count', current_round.pump_count + 1,
      'pop_chance', pop_chance,
      'is_first_pump', is_first_pump
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get burn pool stats
CREATE OR REPLACE FUNCTION get_burn_pool_stats() RETURNS JSON AS $$
DECLARE
  burn_pool_data RECORD;
  result JSON;
BEGIN
  SELECT * INTO burn_pool_data FROM burn_pool WHERE id = 'burn-pool-main';
  
  IF burn_pool_data IS NULL THEN
    result := json_build_object(
      'success', false,
      'error', 'Burn pool not found'
    );
  ELSE
    result := json_build_object(
      'success', true,
      'total_burned', burn_pool_data.total_burned,
      'last_updated', burn_pool_data.last_updated
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get enhanced game state
CREATE OR REPLACE FUNCTION get_enhanced_game_state(token_address TEXT) RETURNS JSON AS $$
DECLARE
  current_round RECORD;
  burn_pool_data RECORD;
  result JSON;
  pressure_percentage DECIMAL;
  pop_chance INTEGER;
BEGIN
  -- Get current round
  SELECT * INTO current_round FROM game_rounds 
  WHERE token_address = get_enhanced_game_state.token_address 
  AND status = 'active' 
  ORDER BY created_at DESC LIMIT 1;
  
  -- Get burn pool data
  SELECT * INTO burn_pool_data FROM burn_pool WHERE id = 'burn-pool-main';
  
  IF current_round IS NULL THEN
    result := json_build_object(
      'success', false,
      'error', 'No active game found'
    );
  ELSE
    -- Calculate pressure percentage
    pressure_percentage := (current_round.pressure::DECIMAL / 1000) * 100;
    
    -- Calculate pop chance
    pop_chance := LEAST(5 + (current_round.pressure::INTEGER / 20), 50);
    
    -- Add extra chance for first pump
    IF current_round.pump_count = 0 THEN
      pop_chance := pop_chance + 10;
    END IF;
    
    result := json_build_object(
      'success', true,
      'round_id', current_round.id,
      'round_number', current_round.round_number,
      'status', current_round.status,
      'pressure', current_round.pressure,
      'pot', current_round.pot_amount,
      'burn_pool', COALESCE(current_round.burn_pool, '0'),
      'total_burned', COALESCE(burn_pool_data.total_burned, '0'),
      'pump_count', current_round.pump_count,
      'last_pumper', current_round.last_pumper,
      'pressure_percentage', pressure_percentage,
      'pop_chance', pop_chance,
      'is_first_pump', (current_round.pump_count = 0),
      'house_pump_amount', current_round.house_pump_amount,
      'created_at', current_round.created_at
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Test the new mechanics
SELECT 'Enhanced game mechanics installed!' as status;

-- =================================================
-- FIX ROUND RESET - Working with Current Schema
-- This creates a working version that automatically resets rounds
-- =================================================

-- Create a working simulate_pump function that uses existing columns
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
  result JSON;
BEGIN
  -- Get current round
  SELECT * INTO current_round FROM rounds_cache WHERE status = 'active' LIMIT 1;
  
  IF current_round IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No active round');
  END IF;

  -- Convert pump amount to decimal
  pump_amount_decimal := pump_amount::DECIMAL;
  
  -- Calculate new pressure and pot
  new_pressure := COALESCE(current_round.pressure::DECIMAL, 0) + pump_amount_decimal;
  new_pot := COALESCE(current_round.pot::DECIMAL, 0) + (pump_amount_decimal * 0.1);
  
  -- Simple pop logic - pop at 1000 pressure OR random chance
  should_pop := new_pressure >= 1000;
  
  -- If not popped by threshold, check random chance (5%)
  IF NOT should_pop THEN
    should_pop := (random() * 100) < 5;
  END IF;
  
  IF should_pop THEN
    -- Balloon popped! Create new round
    UPDATE rounds_cache SET
      status = 'ended',
      pressure = new_pressure::TEXT,
      pot = new_pot::TEXT,
      updated_at = NOW()
    WHERE round_id = current_round.round_id;
    
    -- Create new round automatically
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
      'second', current_round.last2,
      'third', current_round.last3,
      'new_round_created', true,
      'new_round_id', (COALESCE(current_round.round_id::INTEGER, 0) + 1)::TEXT
    );
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
      'round_id', current_round.round_id
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create a simple manual_pump function
CREATE OR REPLACE FUNCTION manual_pump(
  user_address TEXT,
  pump_amount TEXT
) RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT simulate_pump_working(user_address, pump_amount) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get game stats
CREATE OR REPLACE FUNCTION get_game_stats() RETURNS JSON AS $$
DECLARE
  stats JSON;
  current_round_data JSON;
  recent_rounds_data JSON;
BEGIN
  -- Get current round data
  SELECT json_build_object(
    'round_id', round_id,
    'pressure', pressure,
    'pot', pot,
    'last1', last1,
    'last2', last2,
    'last3', last3
  ) INTO current_round_data
  FROM rounds_cache 
  WHERE status = 'active' 
  LIMIT 1;
  
  -- Get recent rounds data (simplified)
  SELECT json_agg(
    json_build_object(
      'round_id', round_id,
      'status', status,
      'pressure', pressure,
      'pot', pot,
      'last1', last1
    )
  ) INTO recent_rounds_data
  FROM (
    SELECT round_id, status, pressure, pot, last1
    FROM rounds_cache 
    ORDER BY updated_at DESC 
    LIMIT 5
  ) recent_rounds_subquery;
  
  -- Build final stats object
  SELECT json_build_object(
    'active_rounds', (SELECT COUNT(*) FROM rounds_cache WHERE status = 'active'),
    'total_rounds', (SELECT COUNT(*) FROM rounds_cache),
    'total_payouts', (SELECT COUNT(*) FROM rounds_cache WHERE status = 'ended'),
    'total_pumps', (SELECT COUNT(*) FROM pumps),
    'total_users', (SELECT COUNT(*) FROM profiles),
    'current_round', current_round_data,
    'recent_rounds', recent_rounds_data
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT 'Functions created successfully!' as status;

-- Test a pump
SELECT manual_pump('0x1111111111111111111111111111111111111111', '100') as test_pump;

-- Test game stats
SELECT get_game_stats() as game_stats;

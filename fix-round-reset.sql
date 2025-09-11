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
  
  -- Check if balloon is already popped (shouldn't happen but safety check)
  IF current_round.status = 'ended' THEN
    RETURN json_build_object('success', false, 'error', 'Balloon already popped');
  END IF;

  -- Convert pump amount to decimal
  pump_amount_decimal := pump_amount::DECIMAL;
  
  -- Calculate new pressure and pot
  new_pressure := COALESCE(current_round.pressure::DECIMAL, 0) + pump_amount_decimal;
  new_pot := COALESCE(current_round.pot::DECIMAL, 0) + pump_amount_decimal;
  
  -- Random pop logic - exponential increase with pressure
  -- Balloon can go past 1000 pressure with exponentially increasing pop chance
  DECLARE
    random_factor DECIMAL;
    pressure_factor DECIMAL;
    combined_chance DECIMAL;
  BEGIN
    -- Generate random factor (0-1)
    random_factor := random();
    
    -- Pressure factor - exponential increase past 1000
    -- At 1000: 15% chance, at 1500: 50% chance, at 2000: 90% chance
    IF new_pressure <= 1000 THEN
      pressure_factor := new_pressure / 1000.0;
      combined_chance := 0.03 + (pressure_factor * 0.12); -- 3% to 15%
    ELSE
      -- Exponential increase past 1000
      pressure_factor := (new_pressure - 1000) / 1000.0; -- 0 to 1+ for pressures > 1000
      combined_chance := 0.15 + (pressure_factor * pressure_factor * 0.75); -- 15% to 90%
    END IF;
    
    -- Cap the chance at 95% (never 100% to keep it interesting)
    combined_chance := LEAST(combined_chance, 0.95);
    
    -- Check if balloon should pop
    should_pop := random_factor < combined_chance;
  END;
  
  IF should_pop THEN
    -- Balloon popped! Calculate dynamic payouts based on pressure
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
      -- Calculate pressure ratio (0.0 to 2.0+, where 1.0 = 1000 pressure, 2.0 = 2000 pressure)
      pressure_ratio := new_pressure / 1000.0;
      
      -- Dynamic payout percentages based on pressure
      -- Early pops (low pressure): More to house (dev/burn)
      -- Later pops (high pressure): More to players
      -- Cap pressure_ratio at 2.0 for payout calculations (2000+ pressure = max player rewards)
      pressure_ratio := LEAST(pressure_ratio, 2.0);
      
      winner_pct := 0.5 + (pressure_ratio * 0.15);  -- 50% to 80% (at 2000+ pressure)
      second_pct := 0.05 + (pressure_ratio * 0.025); -- 5% to 10%
      third_pct := 0.02 + (pressure_ratio * 0.015);  -- 2% to 5%
      dev_pct := 0.15 - (pressure_ratio * 0.05);     -- 15% to 5%
      burn_pct := 0.28 - (pressure_ratio * 0.14);    -- 28% to 0%
      
      -- Calculate actual amounts
      winner_amount := new_pot * winner_pct;
      second_amount := new_pot * second_pct;
      third_amount := new_pot * third_pct;
      dev_amount := new_pot * dev_pct;
      burn_amount := new_pot * burn_pct;
      
      -- Update round status
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
        'game_ended', true,
        'pressure', new_pressure::TEXT,
        'pot', new_pot::TEXT,
        'winner', current_round.last1,
        'second', current_round.last2,
        'third', current_round.last3,
        'new_round_created', true,
        'new_round_id', (COALESCE(current_round.round_id::INTEGER, 0) + 1)::TEXT,
        'pop_reason', CASE 
          WHEN new_pressure >= 1000 THEN 'threshold_reached'
          ELSE 'random_pop'
        END,
        'payout_structure', json_build_object(
          'pressure_ratio', pressure_ratio,
          'winner_pct', winner_pct,
          'second_pct', second_pct,
          'third_pct', third_pct,
          'dev_pct', dev_pct,
          'burn_pct', burn_pct,
          'winner_amount', winner_amount,
          'second_amount', second_amount,
          'third_amount', third_amount,
          'dev_amount', dev_amount,
          'burn_amount', burn_amount
        )
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
-- Function to get current payout percentages based on pressure
CREATE OR REPLACE FUNCTION get_current_payout_percentages() RETURNS JSON AS $$
DECLARE
  current_round RECORD;
  pressure_ratio DECIMAL;
  winner_pct DECIMAL;
  second_pct DECIMAL;
  third_pct DECIMAL;
  dev_pct DECIMAL;
  burn_pct DECIMAL;
BEGIN
  -- Get current round
  SELECT * INTO current_round FROM rounds_cache WHERE status = 'active' LIMIT 1;
  
  IF current_round IS NULL THEN
    RETURN json_build_object('error', 'No active round');
  END IF;
  
  -- Calculate pressure ratio (0.0 to 2.0+, where 1.0 = 1000 pressure, 2.0 = 2000 pressure)
  pressure_ratio := COALESCE(current_round.pressure::DECIMAL, 0) / 1000.0;
  
  -- Cap pressure_ratio at 2.0 for payout calculations (2000+ pressure = max player rewards)
  pressure_ratio := LEAST(pressure_ratio, 2.0);
  
  -- Dynamic payout percentages based on pressure
  winner_pct := 0.5 + (pressure_ratio * 0.15);  -- 50% to 80% (at 2000+ pressure)
  second_pct := 0.05 + (pressure_ratio * 0.025); -- 5% to 10%
  third_pct := 0.02 + (pressure_ratio * 0.015);  -- 2% to 5%
  dev_pct := 0.15 - (pressure_ratio * 0.05);     -- 15% to 5%
  burn_pct := 0.28 - (pressure_ratio * 0.14);    -- 28% to 0%
  
  RETURN json_build_object(
    'pressure', current_round.pressure,
    'pressure_ratio', pressure_ratio,
    'winner_pct', winner_pct,
    'second_pct', second_pct,
    'third_pct', third_pct,
    'dev_pct', dev_pct,
    'burn_pct', burn_pct,
    'winner_pct_display', ROUND(winner_pct * 100, 1),
    'second_pct_display', ROUND(second_pct * 100, 1),
    'third_pct_display', ROUND(third_pct * 100, 1),
    'dev_pct_display', ROUND(dev_pct * 100, 1),
    'burn_pct_display', ROUND(burn_pct * 100, 1)
  );
END;
$$ LANGUAGE plpgsql;

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

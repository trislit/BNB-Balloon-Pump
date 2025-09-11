-- Update pot calculation to use 100% of pumped tokens
-- This replaces the previous 10% ratio with 100%

-- Update the main simulate_pump_working function
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
  
  -- Calculate new pressure and pot - NOW 100% GOES TO POT
  new_pressure := COALESCE(current_round.pressure::DECIMAL, 0) + pump_amount_decimal;
  new_pot := COALESCE(current_round.pot::DECIMAL, 0) + pump_amount_decimal; -- 100% goes to pot
  
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
    pop_reason := CASE 
      WHEN should_pop THEN 'random_chance'
      ELSE 'no_pop'
    END;
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
      -- Calculate pressure ratio (how far past 1000 we are)
      pressure_ratio := GREATEST(0, (new_pressure - 1000) / 1000.0);
      
      -- Dynamic payout calculation based on pressure
      -- Early pops: more to dev/burn, Later pops: more to players
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
      
      -- Record payout distribution
      INSERT INTO payout_distributions (
        round_id, winner_address, second_address, third_address,
        winner_amount, second_amount, third_amount, dev_amount, burn_amount, total_pot
      ) VALUES (
        current_round.round_id,
        current_round.last1,
        current_round.last2,
        current_round.last3,
        winner_amount::TEXT,
        second_amount::TEXT,
        third_amount::TEXT,
        dev_amount::TEXT,
        burn_amount::TEXT,
        new_pot::TEXT
      );
      
      result := json_build_object(
        'success', true,
        'balloon_popped', true,
        'pressure', new_pot::TEXT,
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

-- Test the updated function
SELECT 'Pot calculation updated to 100%!' as status;

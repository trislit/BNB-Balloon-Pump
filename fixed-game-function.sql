-- Fixed Balloon Pump Game Function with proper round management
CREATE OR REPLACE FUNCTION simulate_pump_hybrid(
  user_address TEXT,
  pump_amount TEXT,
  is_test BOOLEAN DEFAULT true
) RETURNS TABLE(
  success BOOLEAN,
  new_pressure TEXT,
  new_pot TEXT,
  balloon_popped BOOLEAN,
  winner_reward TEXT,
  pop_threshold TEXT,
  risk_level TEXT
) AS $$
DECLARE
  current_round_id INTEGER;
  current_pressure DECIMAL;
  current_pot DECIMAL;
  pump_value DECIMAL;
  new_pressure_val DECIMAL;
  new_pot_val DECIMAL;
  pressure_increase DECIMAL;
  pot_contribution DECIMAL;
  popped BOOLEAN := FALSE;
  winner_reward_val DECIMAL := 0;
  pop_threshold_val DECIMAL;
  risk_level_val TEXT;
  random_factor DECIMAL;
  base_threshold DECIMAL := 80; -- Base threshold for popping
  max_threshold DECIMAL := 120; -- Maximum threshold
BEGIN
  -- Get current active round ID
  SELECT COALESCE(MAX(round_id), 1) INTO current_round_id
  FROM rounds_cache WHERE status = 'active';
  
  -- Get current round state
  SELECT CAST(COALESCE(pressure, '0') AS DECIMAL), CAST(COALESCE(pot, '0') AS DECIMAL)
  INTO current_pressure, current_pot
  FROM rounds_cache WHERE round_id = current_round_id;

  -- Calculate pump effects with dynamic scaling
  pump_value := CAST(pump_amount AS DECIMAL);
  
  -- Dynamic pressure increase based on current pressure (riskier as it gets higher)
  IF current_pressure < 30 THEN
    pressure_increase := pump_value / 8; -- 1/8th for low pressure
  ELSIF current_pressure < 60 THEN
    pressure_increase := pump_value / 6; -- 1/6th for medium pressure
  ELSE
    pressure_increase := pump_value / 4; -- 1/4th for high pressure (more dangerous!)
  END IF;
  
  -- Pot contribution (10% of pump amount)
  pot_contribution := pump_value * 0.1;
  
  new_pressure_val := current_pressure + pressure_increase;
  new_pot_val := current_pot + pot_contribution;

  -- Calculate dynamic pop threshold with randomness
  -- Higher pressure = higher chance of popping, but with randomness
  random_factor := (RANDOM() * 40) + base_threshold; -- Random between 80-120
  pop_threshold_val := LEAST(random_factor, max_threshold);
  
  -- Determine risk level
  IF new_pressure_val > 90 THEN
    risk_level_val := 'EXTREME';
  ELSIF new_pressure_val > 70 THEN
    risk_level_val := 'HIGH';
  ELSIF new_pressure_val > 50 THEN
    risk_level_val := 'MEDIUM';
  ELSE
    risk_level_val := 'LOW';
  END IF;

  -- Check if balloon pops (random threshold)
  IF new_pressure_val >= pop_threshold_val THEN
    popped := TRUE;
    
    -- Calculate winner reward (85% of pot)
    winner_reward_val := new_pot_val * 0.85;
    
    -- Award winner (only in test mode)
    IF is_test THEN
      UPDATE profiles 
      SET test_tokens = CAST(CAST(COALESCE(test_tokens, '0') AS DECIMAL) + winner_reward_val AS TEXT)
      WHERE evm_address = user_address;
      
      -- Log the win
      INSERT INTO token_transactions (user_id, transaction_type, amount, round_id, is_test_mode)
      VALUES (user_address, 'balloon_pop_win', CAST(winner_reward_val AS TEXT), current_round_id, true);
    END IF;
    
    -- Mark current round as ended
    UPDATE rounds_cache SET
      status = 'ended',
      winner = user_address,
      final_reward = CAST(winner_reward_val AS TEXT),
      ended_at = NOW()
    WHERE round_id = current_round_id;
    
    -- Create new round
    INSERT INTO rounds_cache (round_id, status, pressure, pot, last1, last2, last3, created_at, updated_at)
    VALUES (
      current_round_id + 1,
      'active',
      '0',
      '0',
      NULL,
      NULL,
      NULL,
      NOW(),
      NOW()
    );
    
    -- Set return values for popped state
    new_pressure_val := 0;
    new_pot_val := 0;
  ELSE
    -- Update current round state
    UPDATE rounds_cache SET
      pressure = CAST(new_pressure_val AS TEXT),
      pot = CAST(new_pot_val AS TEXT),
      last3 = last2,
      last2 = last1,
      last1 = user_address,
      updated_at = NOW()
    WHERE round_id = current_round_id;
  END IF;

  -- Log the pump action
  IF is_test THEN
    INSERT INTO token_transactions (user_id, transaction_type, amount, round_id, is_test_mode)
    VALUES (user_address, 'pump', pump_amount, current_round_id, true);
  END IF;

  -- Return results
  RETURN QUERY SELECT 
    TRUE as success,
    CAST(new_pressure_val AS TEXT) as new_pressure,
    CAST(new_pot_val AS TEXT) as new_pot,
    popped as balloon_popped,
    CAST(winner_reward_val AS TEXT) as winner_reward,
    CAST(pop_threshold_val AS TEXT) as pop_threshold,
    risk_level_val as risk_level;
END;
$$ LANGUAGE plpgsql;

-- Fix pump_balloon function to resolve ambiguous column reference
DROP FUNCTION IF EXISTS pump_balloon(TEXT, TEXT, DECIMAL);

CREATE OR REPLACE FUNCTION pump_balloon(
  p_user_address TEXT,
  p_token_address TEXT,
  p_pump_amount DECIMAL
) RETURNS JSON AS $$
DECLARE
  current_round RECORD;
  new_pressure DECIMAL;
  new_pot DECIMAL;
  should_pop BOOLEAN := false;
  pop_chance DECIMAL;
  result JSON;
BEGIN
  -- Get current active round
  SELECT * INTO current_round 
  FROM game_rounds 
  WHERE token_address = p_token_address 
  AND status = 'active' 
  LIMIT 1;

  IF current_round IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No active game round found'
    );
  END IF;

  -- Check if user has sufficient balance
  IF NOT EXISTS (
    SELECT 1 FROM user_balances 
    WHERE user_address = p_user_address 
    AND token_address = p_token_address 
    AND balance >= p_pump_amount
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient balance'
    );
  END IF;

  -- Calculate new pressure and pot
  new_pressure := COALESCE(current_round.pressure, 0) + p_pump_amount;
  new_pot := COALESCE(current_round.pot_amount, 0) + p_pump_amount;

  -- Calculate pop chance based on pressure
  IF new_pressure <= 1000 THEN
    pop_chance := 3 + (new_pressure / 1000) * 12; -- 3% to 15% for 0-1000 pressure
  ELSE
    pop_chance := 15 + ((new_pressure - 1000) / 1000) * 80; -- 15% to 95% for 1000+ pressure
  END IF;

  -- Check if balloon should pop
  should_pop := (random() * 100) < pop_chance;

  IF should_pop THEN
    -- Balloon popped! End the round and create historical record
    UPDATE game_rounds SET
      status = 'ended',
      pressure = new_pressure,
      pot_amount = new_pot,
      winner_address = p_user_address,
      second_address = current_round.second_address,
      third_address = current_round.third_address,
      ended_at = NOW()
    WHERE id = current_round.id;

    -- Create historical game record
    INSERT INTO historical_games (
      game_id, round_number, token_address, winner_address, 
      second_address, third_address, final_pressure, total_pot,
      winner_payout, second_payout, third_payout, dev_payout, burn_payout,
      ended_at, duration_seconds
    ) VALUES (
      current_round.id, current_round.round_number, p_token_address, p_user_address,
      current_round.second_address, current_round.third_address, new_pressure, new_pot,
      new_pot * 0.8, new_pot * 0.1, new_pot * 0.05, new_pot * 0.025, new_pot * 0.025,
      NOW(), EXTRACT(EPOCH FROM (NOW() - current_round.created_at))
    );

    -- Update user balances with winnings
    UPDATE user_balances SET
      balance = balance - p_pump_amount + (new_pot * 0.8),
      total_winnings = total_winnings + (new_pot * 0.8),
      last_updated = NOW()
    WHERE user_address = p_user_address AND token_address = p_token_address;

    -- Update second place if exists
    IF current_round.second_address IS NOT NULL THEN
      UPDATE user_balances SET
        balance = balance + (new_pot * 0.1),
        total_winnings = total_winnings + (new_pot * 0.1),
        last_updated = NOW()
      WHERE user_address = current_round.second_address AND token_address = p_token_address;
    END IF;

    -- Update third place if exists
    IF current_round.third_address IS NOT NULL THEN
      UPDATE user_balances SET
        balance = balance + (new_pot * 0.05),
        total_winnings = total_winnings + (new_pot * 0.05),
        last_updated = NOW()
      WHERE user_address = current_round.third_address AND token_address = p_token_address;
    END IF;

    -- Create new round
    INSERT INTO game_rounds (
      token_address, round_number, status, pressure, pot_amount,
      created_at, pop_chance
    ) VALUES (
      p_token_address, current_round.round_number + 1, 'active', 0, 0,
      NOW(), 500
    );

    result := json_build_object(
      'success', true,
      'balloon_popped', true,
      'pressure', new_pressure,
      'pot', new_pot,
      'winner', p_user_address,
      'winner_payout', new_pot * 0.8,
      'second_payout', new_pot * 0.1,
      'third_payout', new_pot * 0.05,
      'pop_chance', pop_chance
    );
  ELSE
    -- Normal pump - update round
    UPDATE game_rounds SET
      pressure = new_pressure,
      pot_amount = new_pot,
      third_address = current_round.second_address,
      second_address = current_round.winner_address,
      winner_address = p_user_address,
      last_updated = NOW()
    WHERE id = current_round.id;

    -- Deduct pump amount from user balance
    UPDATE user_balances SET
      balance = balance - p_pump_amount,
      last_updated = NOW()
    WHERE user_address = p_user_address AND token_address = p_token_address;

    result := json_build_object(
      'success', true,
      'balloon_popped', false,
      'pressure', new_pressure,
      'pot', new_pot,
      'last_pumper', p_user_address,
      'pop_chance', pop_chance
    );
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

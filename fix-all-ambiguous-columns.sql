-- Fix All Ambiguous Column References
-- This script fixes ALL ambiguous column references in the production functions

-- Fix get_token_game_status function
CREATE OR REPLACE FUNCTION get_token_game_status(token_address TEXT)
RETURNS JSON AS $$
DECLARE
  current_round RECORD;
  token_status RECORD;
  result JSON;
BEGIN
  -- Get current active round for this token
  SELECT * INTO current_round 
  FROM game_rounds 
  WHERE game_rounds.token_address = get_token_game_status.token_address 
    AND status = 'active' 
  ORDER BY created_at DESC 
  LIMIT 1;

  -- Get token status
  SELECT * INTO token_status 
  FROM token_game_status 
  WHERE token_game_status.token_address = get_token_game_status.token_address;

  IF current_round IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No active game for this token'
    );
  END IF;

  result := json_build_object(
    'success', true,
    'game_id', current_round.id,
    'round_number', current_round.round_number,
    'token_address', current_round.token_address,
    'status', current_round.status,
    'pressure', current_round.pressure,
    'pot_amount', current_round.pot_amount,
    'pop_chance', current_round.pop_chance,
    'winner_address', current_round.winner_address,
    'second_address', current_round.second_address,
    'third_address', current_round.third_address,
    'total_pumps', current_round.total_pumps,
    'created_at', current_round.created_at,
    'token_stats', json_build_object(
      'total_games_played', COALESCE(token_status.total_games_played, 0),
      'total_volume', COALESCE(token_status.total_volume, 0),
      'last_activity', token_status.last_activity,
      'is_active', COALESCE(token_status.is_active, true)
    )
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fix get_user_balance function
CREATE OR REPLACE FUNCTION get_user_balance(user_address TEXT, token_address TEXT)
RETURNS JSON AS $$
DECLARE
  balance_record RECORD;
  result JSON;
BEGIN
  SELECT * INTO balance_record 
  FROM user_balances 
  WHERE user_balances.user_address = get_user_balance.user_address 
    AND user_balances.token_address = get_user_balance.token_address;

  IF balance_record IS NULL THEN
    -- Create new balance record with 0 balance
    INSERT INTO user_balances (user_address, token_address, balance)
    VALUES (get_user_balance.user_address, get_user_balance.token_address, 0)
    RETURNING * INTO balance_record;
  END IF;

  result := json_build_object(
    'success', true,
    'user_address', balance_record.user_address,
    'token_address', balance_record.token_address,
    'balance', balance_record.balance,
    'total_deposited', balance_record.total_deposited,
    'total_withdrawn', balance_record.total_withdrawn,
    'total_winnings', balance_record.total_winnings,
    'last_updated', balance_record.last_updated
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fix get_historical_games function
CREATE OR REPLACE FUNCTION get_historical_games(
  token_address TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 10
) RETURNS JSON AS $$
DECLARE
  games JSON;
  result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'game_id', hg.game_id,
      'round_number', hg.round_number,
      'token_address', hg.token_address,
      'winner_address', hg.winner_address,
      'second_address', hg.second_address,
      'third_address', hg.third_address,
      'final_pressure', hg.final_pressure,
      'total_pot', hg.total_pot,
      'winner_payout', hg.winner_payout,
      'second_payout', hg.second_payout,
      'third_payout', hg.third_payout,
      'dev_payout', hg.dev_payout,
      'burn_payout', hg.burn_payout,
      'total_pumps', hg.total_pumps,
      'duration_seconds', hg.duration_seconds,
      'ended_at', hg.ended_at
    ) ORDER BY hg.ended_at DESC
  ) INTO games
  FROM historical_games hg
  WHERE (get_historical_games.token_address IS NULL OR hg.token_address = get_historical_games.token_address)
  ORDER BY hg.ended_at DESC
  LIMIT limit_count;

  result := json_build_object(
    'success', true,
    'games', COALESCE(games, '[]'::json),
    'count', COALESCE(json_array_length(games), 0)
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fix pump_balloon function (complete version)
CREATE OR REPLACE FUNCTION pump_balloon(
  user_address TEXT,
  token_address TEXT,
  pump_amount DECIMAL
) RETURNS JSON AS $$
DECLARE
  current_round RECORD;
  new_pressure DECIMAL;
  new_pot DECIMAL;
  should_pop BOOLEAN := false;
  pop_reason TEXT;
  winner_address TEXT;
  second_address TEXT;
  third_address TEXT;
  winner_payout DECIMAL;
  second_payout DECIMAL;
  third_payout DECIMAL;
  dev_payout DECIMAL;
  burn_payout DECIMAL;
  new_round_id UUID;
  result JSON;
BEGIN
  -- Get current active round for this token
  SELECT * INTO current_round 
  FROM game_rounds 
  WHERE game_rounds.token_address = pump_balloon.token_address 
    AND status = 'active' 
  ORDER BY created_at DESC 
  LIMIT 1;

  -- If no active round, create one
  IF current_round IS NULL THEN
    INSERT INTO game_rounds (round_number, token_address, status, pressure, pot_amount, pop_chance)
    VALUES (
      COALESCE((SELECT MAX(round_number) FROM game_rounds WHERE game_rounds.token_address = pump_balloon.token_address), 0) + 1,
      pump_balloon.token_address,
      'active',
      0,
      0,
      500 -- 5% base pop chance
    )
    RETURNING id INTO new_round_id;
    
    SELECT * INTO current_round 
    FROM game_rounds 
    WHERE id = new_round_id;
  END IF;

  -- Check if user has sufficient balance
  IF NOT EXISTS (
    SELECT 1 FROM user_balances 
    WHERE user_balances.user_address = pump_balloon.user_address 
      AND user_balances.token_address = pump_balloon.token_address 
      AND balance >= pump_amount
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient balance'
    );
  END IF;

  -- Calculate new pressure and pot
  new_pressure := current_round.pressure + pump_amount;
  new_pot := current_round.pot_amount + pump_amount;

  -- Determine if balloon should pop
  -- Base chance + pressure-based increase
  IF new_pressure > 1000 THEN
    -- Exponential increase after 1000 pressure
    should_pop := (random() < (0.05 + (new_pressure - 1000) * 0.0001));
    pop_reason := 'pressure_threshold';
  ELSE
    -- Base 5% chance
    should_pop := (random() < 0.05);
    pop_reason := 'random';
  END IF;

  -- Update user balance (deduct pump amount)
  UPDATE user_balances 
  SET balance = user_balances.balance - pump_amount,
      last_updated = NOW()
  WHERE user_balances.user_address = pump_balloon.user_address 
    AND user_balances.token_address = pump_balloon.token_address;

  -- Update round with new pressure and pot
  UPDATE game_rounds 
  SET pressure = new_pressure,
      pot_amount = new_pot,
      total_pumps = total_pumps + 1,
      third_address = current_round.second_address,
      second_address = current_round.winner_address,
      winner_address = pump_balloon.user_address
  WHERE id = current_round.id;

  IF should_pop THEN
    -- Balloon popped! Calculate payouts
    winner_address := pump_balloon.user_address;
    second_address := current_round.winner_address;
    third_address := current_round.second_address;

    -- Calculate payouts (80/10/5/2.5/2.5)
    winner_payout := new_pot * 0.8;
    second_payout := new_pot * 0.1;
    third_payout := new_pot * 0.05;
    dev_payout := new_pot * 0.025;
    burn_payout := new_pot * 0.025;

    -- Update winner balances
    IF winner_address IS NOT NULL THEN
      INSERT INTO user_balances (user_address, token_address, balance, total_winnings)
      VALUES (winner_address, pump_balloon.token_address, winner_payout, winner_payout)
      ON CONFLICT (user_address, token_address)
      DO UPDATE SET 
        balance = user_balances.balance + winner_payout,
        total_winnings = user_balances.total_winnings + winner_payout,
        last_updated = NOW();
    END IF;

    IF second_address IS NOT NULL THEN
      INSERT INTO user_balances (user_address, token_address, balance, total_winnings)
      VALUES (second_address, pump_balloon.token_address, second_payout, second_payout)
      ON CONFLICT (user_address, token_address)
      DO UPDATE SET 
        balance = user_balances.balance + second_payout,
        total_winnings = user_balances.total_winnings + second_payout,
        last_updated = NOW();
    END IF;

    IF third_address IS NOT NULL THEN
      INSERT INTO user_balances (user_address, token_address, balance, total_winnings)
      VALUES (third_address, pump_balloon.token_address, third_payout, third_payout)
      ON CONFLICT (user_address, token_address)
      DO UPDATE SET 
        balance = user_balances.balance + third_payout,
        total_winnings = user_balances.total_winnings + third_payout,
        last_updated = NOW();
    END IF;

    -- Mark current round as ended
    UPDATE game_rounds 
    SET status = 'ended',
        ended_at = NOW()
    WHERE id = current_round.id;

    -- Record historical game
    INSERT INTO historical_games (
      game_id, round_number, token_address, winner_address, second_address, third_address,
      final_pressure, total_pot, winner_payout, second_payout, third_payout,
      dev_payout, burn_payout, total_pumps, duration_seconds, ended_at
    ) VALUES (
      current_round.id, current_round.round_number, pump_balloon.token_address,
      winner_address, second_address, third_address, new_pressure, new_pot,
      winner_payout, second_payout, third_payout, dev_payout, burn_payout,
      current_round.total_pumps, EXTRACT(EPOCH FROM (NOW() - current_round.created_at)), NOW()
    );

    -- Update token game status
    UPDATE token_game_status 
    SET total_games_played = total_games_played + 1,
        total_volume = total_volume + new_pot,
        last_activity = NOW()
    WHERE token_game_status.token_address = pump_balloon.token_address;

    result := json_build_object(
      'success', true,
      'balloon_popped', true,
      'pressure', new_pressure,
      'pot', new_pot,
      'winner', winner_address,
      'winner_payout', winner_payout,
      'second_payout', second_payout,
      'third_payout', third_payout,
      'pop_reason', pop_reason,
      'game_ended', true
    );
  ELSE
    result := json_build_object(
      'success', true,
      'balloon_popped', false,
      'pressure', new_pressure,
      'pot', new_pot,
      'last_pumper', pump_balloon.user_address
    );
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fix deposit_tokens function
CREATE OR REPLACE FUNCTION deposit_tokens(
  user_address TEXT,
  token_address TEXT,
  amount DECIMAL
) RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  INSERT INTO user_balances (user_address, token_address, balance, total_deposited)
  VALUES (deposit_tokens.user_address, deposit_tokens.token_address, deposit_tokens.amount, deposit_tokens.amount)
  ON CONFLICT (user_address, token_address)
  DO UPDATE SET 
    balance = user_balances.balance + deposit_tokens.amount,
    total_deposited = user_balances.total_deposited + deposit_tokens.amount,
    last_updated = NOW();

  result := json_build_object(
    'success', true,
    'message', 'Deposit successful',
    'amount', deposit_tokens.amount
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fix withdraw_tokens function
CREATE OR REPLACE FUNCTION withdraw_tokens(
  user_address TEXT,
  token_address TEXT,
  amount DECIMAL
) RETURNS JSON AS $$
DECLARE
  current_balance DECIMAL;
  result JSON;
BEGIN
  -- Get current balance
  SELECT balance INTO current_balance 
  FROM user_balances 
  WHERE user_balances.user_address = withdraw_tokens.user_address 
    AND user_balances.token_address = withdraw_tokens.token_address;

  IF current_balance IS NULL OR current_balance < withdraw_tokens.amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient balance'
    );
  END IF;

  -- Update balance
  UPDATE user_balances 
  SET balance = user_balances.balance - withdraw_tokens.amount,
      total_withdrawn = user_balances.total_withdrawn + withdraw_tokens.amount,
      last_updated = NOW()
  WHERE user_balances.user_address = withdraw_tokens.user_address 
    AND user_balances.token_address = withdraw_tokens.token_address;

  result := json_build_object(
    'success', true,
    'message', 'Withdrawal successful',
    'amount', withdraw_tokens.amount
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

SELECT 'All ambiguous column references fixed!' as status;

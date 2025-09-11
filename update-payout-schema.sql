-- =================================================
-- UPDATE SCHEMA FOR NEW PAYOUT STRUCTURE
-- Implements 80/10/5/2.5/2.5 payout distribution
-- =================================================

-- Add new columns to rounds_cache for pop chance and payout tracking
ALTER TABLE rounds_cache 
ADD COLUMN IF NOT EXISTS pop_chance INTEGER DEFAULT 500, -- 5% default pop chance (0-10000)
ADD COLUMN IF NOT EXISTS winner_payout TEXT DEFAULT '0',
ADD COLUMN IF NOT EXISTS second_payout TEXT DEFAULT '0', 
ADD COLUMN IF NOT EXISTS third_payout TEXT DEFAULT '0',
ADD COLUMN IF NOT EXISTS dev_payout TEXT DEFAULT '0',
ADD COLUMN IF NOT EXISTS burn_payout TEXT DEFAULT '0';

-- Create table to track detailed payout distributions
CREATE TABLE IF NOT EXISTS payout_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id TEXT NOT NULL,
  winner_address TEXT,
  second_address TEXT,
  third_address TEXT,
  winner_amount TEXT NOT NULL DEFAULT '0',
  second_amount TEXT NOT NULL DEFAULT '0',
  third_amount TEXT NOT NULL DEFAULT '0',
  dev_amount TEXT NOT NULL DEFAULT '0',
  burn_amount TEXT NOT NULL DEFAULT '0',
  total_pot TEXT NOT NULL,
  distribution_tx TEXT, -- Blockchain transaction hash
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table to track vault balances per token
CREATE TABLE IF NOT EXISTS vault_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  token_address TEXT NOT NULL,
  balance TEXT NOT NULL DEFAULT '0',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token_address)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payout_distributions_round ON payout_distributions(round_id);
CREATE INDEX IF NOT EXISTS idx_payout_distributions_winner ON payout_distributions(winner_address);
CREATE INDEX IF NOT EXISTS idx_vault_balances_user ON vault_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_balances_token ON vault_balances(token_address);

-- Update the simulate_pump_hybrid function to handle new payout structure
CREATE OR REPLACE FUNCTION simulate_pump_hybrid(
  user_address TEXT,
  pump_amount TEXT,
  is_test BOOLEAN DEFAULT true
) RETURNS JSON AS $$
DECLARE
  current_round RECORD;
  new_pressure DECIMAL;
  new_pot DECIMAL;
  pump_amount_decimal DECIMAL;
  should_pop BOOLEAN := false;
  pop_chance INTEGER;
  random_value INTEGER;
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
  new_pot := COALESCE(current_round.pot::DECIMAL, 0) + pump_amount_decimal; -- 100% goes to pot
  
  -- Check if balloon should pop (threshold or random)
  should_pop := new_pressure >= COALESCE(current_round.threshold::DECIMAL, 1000);
  
  -- If not popped by threshold, check random chance
  IF NOT should_pop THEN
    pop_chance := COALESCE(current_round.pop_chance, 500); -- Default 5%
    random_value := (random() * 10000)::INTEGER;
    should_pop := random_value < pop_chance;
  END IF;
  
  IF should_pop THEN
    -- Balloon popped! Distribute payouts according to new structure
    DECLARE
      winner_amount DECIMAL;
      second_amount DECIMAL;
      third_amount DECIMAL;
      dev_amount DECIMAL;
      burn_amount DECIMAL;
      winner_addr TEXT;
      second_addr TEXT;
      third_addr TEXT;
    BEGIN
      -- Calculate payouts (80/10/5/2.5/2.5)
      winner_amount := new_pot * 0.8;
      second_amount := new_pot * 0.1;
      third_amount := new_pot * 0.05;
      dev_amount := new_pot * 0.025;
      burn_amount := new_pot * 0.025;
      
      -- Get last three pumpers
      winner_addr := current_round.last1;
      second_addr := current_round.last2;
      third_addr := current_round.last3;
      
      -- Update round status
      UPDATE rounds_cache SET
        status = 'ended',
        pressure = new_pressure::TEXT,
        pot = new_pot::TEXT,
        winner_payout = winner_amount::TEXT,
        second_payout = second_amount::TEXT,
        third_payout = third_amount::TEXT,
        dev_payout = dev_amount::TEXT,
        burn_payout = burn_amount::TEXT,
        ended_at = NOW(),
        updated_at = NOW()
      WHERE round_id = current_round.round_id;
      
      -- Record payout distribution
      INSERT INTO payout_distributions (
        round_id, winner_address, second_address, third_address,
        winner_amount, second_amount, third_amount, dev_amount, burn_amount, total_pot
      ) VALUES (
        current_round.round_id, winner_addr, second_addr, third_addr,
        winner_amount::TEXT, second_amount::TEXT, third_amount::TEXT, 
        dev_amount::TEXT, burn_amount::TEXT, new_pot::TEXT
      );
      
      -- Award tokens to winners (test mode)
      IF is_test THEN
        IF winner_addr IS NOT NULL THEN
          UPDATE profiles SET test_tokens = (COALESCE(test_tokens::DECIMAL, 0) + winner_amount)::TEXT
          WHERE evm_address = winner_addr;
        END IF;
        
        IF second_addr IS NOT NULL THEN
          UPDATE profiles SET test_tokens = (COALESCE(test_tokens::DECIMAL, 0) + second_amount)::TEXT
          WHERE evm_address = second_addr;
        END IF;
        
        IF third_addr IS NOT NULL THEN
          UPDATE profiles SET test_tokens = (COALESCE(test_tokens::DECIMAL, 0) + third_amount)::TEXT
          WHERE evm_address = third_addr;
        END IF;
      END IF;
      
      -- Create new round
      INSERT INTO rounds_cache (
        round_id, status, pressure, pot, pop_chance, created_at, updated_at
      ) VALUES (
        (COALESCE(current_round.round_id::INTEGER, 0) + 1)::TEXT,
        'active', '0', '0', 500, NOW(), NOW()
      );
      
      result := json_build_object(
        'success', true,
        'balloon_popped', true,
        'pressure', new_pressure::TEXT,
        'pot', new_pot::TEXT,
        'winner', winner_addr,
        'winner_amount', winner_amount::TEXT,
        'second_amount', second_amount::TEXT,
        'third_amount', third_amount::TEXT,
        'dev_amount', dev_amount::TEXT,
        'burn_amount', burn_amount::TEXT
      );
    END;
  ELSE
    -- Balloon didn't pop, just update pressure and pot
    UPDATE rounds_cache SET
      pressure = new_pressure::TEXT,
      pot = new_pot::TEXT,
      last1 = current_round.last2,
      last2 = current_round.last3,
      last3 = user_address,
      updated_at = NOW()
    WHERE round_id = current_round.round_id;
    
    result := json_build_object(
      'success', true,
      'balloon_popped', false,
      'pressure', new_pressure::TEXT,
      'pot', new_pot::TEXT,
      'pop_chance', COALESCE(current_round.pop_chance, 500)
    );
  END IF;
  
  -- Record pump transaction
  INSERT INTO pumps (
    user_id, round_id, token, spend, status, requested_at
  ) VALUES (
    user_address, current_round.round_id, '0x0000000000000000000000000000000000000000', 
    pump_amount, 'confirmed', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to get vault balance
CREATE OR REPLACE FUNCTION get_vault_balance(
  user_address TEXT,
  token_address TEXT DEFAULT '0x0000000000000000000000000000000000000000'
) RETURNS TEXT AS $$
DECLARE
  balance TEXT;
BEGIN
  SELECT COALESCE(balance, '0') INTO balance 
  FROM vault_balances 
  WHERE user_id = user_address AND token_address = token_address;
  
  IF balance IS NULL THEN
    -- Return test tokens for test mode
    SELECT COALESCE(test_tokens, '0') INTO balance
    FROM profiles 
    WHERE evm_address = user_address;
  END IF;
  
  RETURN COALESCE(balance, '0');
END;
$$ LANGUAGE plpgsql;

-- Create function to update vault balance
CREATE OR REPLACE FUNCTION update_vault_balance(
  user_address TEXT,
  token_address TEXT,
  new_balance TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO vault_balances (user_id, token_address, balance, last_updated)
  VALUES (user_address, token_address, new_balance, NOW())
  ON CONFLICT (user_id, token_address) 
  DO UPDATE SET 
    balance = new_balance,
    last_updated = NOW();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create function to get payout history
CREATE OR REPLACE FUNCTION get_payout_history(
  user_address TEXT,
  limit_count INTEGER DEFAULT 10
) RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'round_id', round_id,
      'winner_amount', winner_amount,
      'second_amount', second_amount,
      'third_amount', third_amount,
      'total_pot', total_pot,
      'created_at', created_at,
      'is_winner', (winner_address = user_address),
      'is_second', (second_address = user_address),
      'is_third', (third_address = user_address)
    )
  ) INTO result
  FROM payout_distributions
  WHERE winner_address = user_address 
     OR second_address = user_address 
     OR third_address = user_address
  ORDER BY created_at DESC
  LIMIT limit_count;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql;

-- Update existing rounds_cache to have default pop_chance
UPDATE rounds_cache SET pop_chance = 500 WHERE pop_chance IS NULL;

-- Add trigger to update vault_balances when profiles.test_tokens changes
CREATE OR REPLACE FUNCTION sync_vault_balance() RETURNS TRIGGER AS $$
BEGIN
  -- Update vault balance for test token (address 0x0)
  INSERT INTO vault_balances (user_id, token_address, balance, last_updated)
  VALUES (NEW.evm_address, '0x0000000000000000000000000000000000000000', NEW.test_tokens, NOW())
  ON CONFLICT (user_id, token_address) 
  DO UPDATE SET 
    balance = NEW.test_tokens,
    last_updated = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for vault balance sync
DROP TRIGGER IF EXISTS sync_vault_balance_trigger ON profiles;
CREATE TRIGGER sync_vault_balance_trigger
  AFTER UPDATE OF test_tokens ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_vault_balance();

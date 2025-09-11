-- =================================================
-- PURE SUPABASE TEST ENVIRONMENT
-- No blockchain integration - perfect for testing game mechanics
-- =================================================

-- First, apply the payout schema updates
\i update-payout-schema.sql

-- Create a test round with moderate pop chance
INSERT INTO rounds_cache (
  round_id, 
  status, 
  pressure, 
  pot, 
  pop_chance, 
  threshold,
  created_at, 
  updated_at
) VALUES (
  '1', 
  'active', 
  '0', 
  '0', 
  500, -- 5% pop chance
  1000, -- 1000 token threshold
  NOW(), 
  NOW()
) ON CONFLICT (round_id) DO UPDATE SET
  status = 'active',
  pressure = '0',
  pot = '0',
  pop_chance = 500,
  threshold = 1000,
  updated_at = NOW();

-- Create test users with different vault balances
INSERT INTO profiles (evm_address, test_tokens, created_at, updated_at) VALUES
  ('0x1111111111111111111111111111111111111111', '5000', NOW(), NOW()),
  ('0x2222222222222222222222222222222222222222', '3000', NOW(), NOW()),
  ('0x3333333333333333333333333333333333333333', '2000', NOW(), NOW()),
  ('0x4444444444444444444444444444444444444444', '1000', NOW(), NOW()),
  ('0x5555555555555555555555555555555555555555', '500', NOW(), NOW())
ON CONFLICT (evm_address) DO UPDATE SET
  test_tokens = EXCLUDED.test_tokens,
  updated_at = NOW();

-- Create a simple test function to simulate multiple pumps
CREATE OR REPLACE FUNCTION test_game_mechanics(
  rounds_to_test INTEGER DEFAULT 5
) RETURNS JSON AS $$
DECLARE
  round_num INTEGER;
  pump_count INTEGER;
  total_pops INTEGER := 0;
  total_pressure DECIMAL := 0;
  total_pot DECIMAL := 0;
  results JSON[] := '{}';
  round_result JSON;
  test_address TEXT;
  pump_amount TEXT;
BEGIN
  -- Test with different users
  FOR round_num IN 1..rounds_to_test LOOP
    -- Reset round
    UPDATE rounds_cache SET
      status = 'active',
      pressure = '0',
      pot = '0',
      last1 = NULL,
      last2 = NULL,
      last3 = NULL,
      pop_chance = 500 + (round_num * 100), -- Increasing pop chance each round
      updated_at = NOW()
    WHERE round_id = '1';
    
    pump_count := 0;
    
    -- Simulate pumps until balloon pops
    WHILE pump_count < 20 LOOP -- Max 20 pumps per round
      -- Pick random user
      test_address := CASE (pump_count % 5)
        WHEN 0 THEN '0x1111111111111111111111111111111111111111'
        WHEN 1 THEN '0x2222222222222222222222222222222222222222'
        WHEN 2 THEN '0x3333333333333333333333333333333333333333'
        WHEN 3 THEN '0x4444444444444444444444444444444444444444'
        ELSE '0x5555555555555555555555555555555555555555'
      END;
      
      -- Random pump amount between 50-200
      pump_amount := (50 + (random() * 150))::INTEGER::TEXT;
      
      -- Execute pump
      SELECT simulate_pump_hybrid(test_address, pump_amount, true) INTO round_result;
      
      pump_count := pump_count + 1;
      total_pressure := total_pressure + (round_result->>'pressure')::DECIMAL;
      total_pot := total_pot + (round_result->>'pot')::DECIMAL;
      
      -- Check if balloon popped
      IF (round_result->>'balloon_popped')::BOOLEAN THEN
        total_pops := total_pops + 1;
        results := results || json_build_object(
          'round', round_num,
          'pumps_until_pop', pump_count,
          'final_pressure', round_result->>'pressure',
          'final_pot', round_result->>'pot',
          'winner', round_result->>'winner',
          'winner_amount', round_result->>'winner_amount',
          'second_amount', round_result->>'second_amount',
          'third_amount', round_result->>'third_amount',
          'pop_chance', round_result->>'pop_chance'
        );
        EXIT; -- Exit the pump loop
      END IF;
    END LOOP;
    
    -- If balloon didn't pop, record that too
    IF NOT (round_result->>'balloon_popped')::BOOLEAN THEN
      results := results || json_build_object(
        'round', round_num,
        'pumps_until_pop', pump_count,
        'final_pressure', round_result->>'pressure',
        'final_pot', round_result->>'pot',
        'balloon_popped', false,
        'pop_chance', round_result->>'pop_chance'
      );
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'total_rounds', rounds_to_test,
    'total_pops', total_pops,
    'pop_rate', (total_pops::DECIMAL / rounds_to_test * 100)::TEXT || '%',
    'average_pressure', (total_pressure / rounds_to_test)::TEXT,
    'average_pot', (total_pot / rounds_to_test)::TEXT,
    'round_results', results
  );
END;
$$ LANGUAGE plpgsql;

-- Create a function to test different pop chances
CREATE OR REPLACE FUNCTION test_pop_chances() RETURNS JSON AS $$
DECLARE
  pop_chance INTEGER;
  test_results JSON[] := '{}';
  result JSON;
  pops INTEGER;
  total_pumps INTEGER;
  i INTEGER;
BEGIN
  -- Test different pop chances
  FOR pop_chance IN 100, 300, 500, 800, 1000, 1500, 2000 LOOP
    pops := 0;
    total_pumps := 0;
    
    -- Run 10 tests for each pop chance
    FOR i IN 1..10 LOOP
      -- Reset round
      UPDATE rounds_cache SET
        status = 'active',
        pressure = '0',
        pot = '0',
        last1 = NULL,
        last2 = NULL,
        last3 = NULL,
        pop_chance = pop_chance,
        updated_at = NOW()
      WHERE round_id = '1';
      
      -- Single pump test
      SELECT simulate_pump_hybrid('0x1111111111111111111111111111111111111111', '100', true) INTO result;
      total_pumps := total_pumps + 1;
      
      IF (result->>'balloon_popped')::BOOLEAN THEN
        pops := pops + 1;
      END IF;
    END LOOP;
    
    test_results := test_results || json_build_object(
      'pop_chance', pop_chance,
      'pop_percentage', (pop_chance / 100.0)::TEXT || '%',
      'actual_pops', pops,
      'actual_rate', (pops::DECIMAL / 10 * 100)::TEXT || '%',
      'total_tests', 10
    );
  END LOOP;
  
  RETURN json_build_object(
    'pop_chance_tests', test_results
  );
END;
$$ LANGUAGE plpgsql;

-- Create a function to get game statistics
CREATE OR REPLACE FUNCTION get_game_stats() RETURNS JSON AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'active_rounds', (SELECT COUNT(*) FROM rounds_cache WHERE status = 'active'),
    'total_rounds', (SELECT COUNT(*) FROM rounds_cache),
    'total_payouts', (SELECT COUNT(*) FROM payout_distributions),
    'total_pumps', (SELECT COUNT(*) FROM pumps),
    'total_users', (SELECT COUNT(*) FROM profiles),
    'total_vault_balance', (SELECT SUM(balance::DECIMAL) FROM vault_balances),
    'recent_payouts', (
      SELECT json_agg(
        json_build_object(
          'round_id', round_id,
          'winner', winner_address,
          'winner_amount', winner_amount,
          'total_pot', total_pot,
          'created_at', created_at
        )
      )
      FROM payout_distributions 
      ORDER BY created_at DESC 
      LIMIT 5
    ),
    'top_vault_balances', (
      SELECT json_agg(
        json_build_object(
          'user_id', user_id,
          'balance', balance,
          'last_updated', last_updated
        )
      )
      FROM vault_balances 
      ORDER BY balance::DECIMAL DESC 
      LIMIT 5
    )
  ) INTO stats;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Create a simple pump function for manual testing
CREATE OR REPLACE FUNCTION manual_pump(
  user_address TEXT,
  pump_amount TEXT
) RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT simulate_pump_hybrid(user_address, pump_amount, true) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION test_game_mechanics(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION test_pop_chances() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_game_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION manual_pump(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION simulate_pump_hybrid(TEXT, TEXT, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_vault_balance(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_payout_history(TEXT, INTEGER) TO anon, authenticated;

-- Enable Row Level Security for test tables
ALTER TABLE payout_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_balances ENABLE ROW LEVEL SECURITY;

-- Create policies for test access (drop existing first)
DROP POLICY IF EXISTS "Allow all access for testing" ON payout_distributions;
DROP POLICY IF EXISTS "Allow all access for testing" ON vault_balances;

CREATE POLICY "Allow all access for testing" ON payout_distributions FOR ALL USING (true);
CREATE POLICY "Allow all access for testing" ON vault_balances FOR ALL USING (true);

-- Insert some sample data for testing
INSERT INTO payout_distributions (
  round_id, winner_address, second_address, third_address,
  winner_amount, second_amount, third_amount, dev_amount, burn_amount, total_pot
) VALUES 
  ('0', '0x1111111111111111111111111111111111111111', '0x2222222222222222222222222222222222222222', '0x3333333333333333333333333333333333333333',
   '800', '100', '50', '25', '25', '1000'),
  ('-1', '0x2222222222222222222222222222222222222222', '0x3333333333333333333333333333333333333333', '0x4444444444444444444444444444444444444444',
   '400', '50', '25', '12.5', '12.5', '500');

COMMIT;

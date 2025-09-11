-- =================================================
-- QUICK TEST SETUP - MINIMAL VERSION
-- Just the essential parts for testing
-- =================================================

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

-- Test the setup
SELECT 'Setup complete! Testing basic functionality...' as status;

-- Test manual pump
SELECT manual_pump('0x1111111111111111111111111111111111111111', '100') as test_pump;

-- Test game stats
SELECT get_game_stats() as game_stats;

-- Test script to verify database functions are working

-- 1. Check current game state
SELECT 'Current Game State:' as test;
SELECT * FROM get_current_game_state();

-- 2. Check rounds_cache table
SELECT 'Rounds Cache:' as test;
SELECT * FROM rounds_cache ORDER BY round_id DESC LIMIT 5;

-- 3. Test the pump function directly
SELECT 'Testing Pump Function:' as test;
SELECT * FROM simulate_pump_hybrid(
  '0x1234567890123456789012345678901234567890',
  '10',
  true
);

-- 4. Check game state after pump
SELECT 'Game State After Pump:' as test;
SELECT * FROM get_current_game_state();

-- 5. Check token transactions
SELECT 'Recent Transactions:' as test;
SELECT * FROM token_transactions ORDER BY created_at DESC LIMIT 5;

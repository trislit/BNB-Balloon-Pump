-- Check if the database functions exist and are working

-- 1. Check if functions exist
SELECT 'Function Existence Check:' as test;
SELECT 
  routine_name, 
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('simulate_pump_hybrid', 'get_current_game_state')
ORDER BY routine_name;

-- 2. Check current rounds_cache data
SELECT 'Current Rounds Cache:' as test;
SELECT * FROM rounds_cache ORDER BY round_id DESC LIMIT 3;

-- 3. Check if there's an active round
SELECT 'Active Round Check:' as test;
SELECT 
  round_id,
  status,
  pressure,
  pot,
  last1,
  last2,
  last3,
  created_at,
  updated_at
FROM rounds_cache 
WHERE status = 'active'
ORDER BY round_id DESC;

-- 4. Test get_current_game_state function (if it exists)
SELECT 'Testing get_current_game_state:' as test;
SELECT * FROM get_current_game_state();

-- 5. Check recent token transactions
SELECT 'Recent Token Transactions:' as test;
SELECT * FROM token_transactions 
ORDER BY created_at DESC 
LIMIT 5;

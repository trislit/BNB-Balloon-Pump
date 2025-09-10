-- Debug script to check what's actually in the database

-- 1. Check all rounds
SELECT 'All Rounds:' as debug;
SELECT * FROM rounds_cache ORDER BY round_id DESC;

-- 2. Check if there's an active round
SELECT 'Active Rounds:' as debug;
SELECT * FROM rounds_cache WHERE status = 'active';

-- 3. Check recent pumps
SELECT 'Recent Pumps:' as debug;
SELECT * FROM pumps ORDER BY requested_at DESC LIMIT 5;

-- 4. Check recent token transactions
SELECT 'Recent Token Transactions:' as debug;
SELECT * FROM token_transactions ORDER BY created_at DESC LIMIT 5;

-- 5. Test the get_current_game_state function
SELECT 'Game State Function Result:' as debug;
SELECT * FROM get_current_game_state();

-- 6. Manually check what the function should return
SELECT 'Manual Game State Check:' as debug;
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
ORDER BY round_id DESC
LIMIT 1;

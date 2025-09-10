-- Reset the game state to test balloon pop logic

-- Reset the current round
UPDATE rounds_cache SET
  pressure = '0',
  pot = '0',
  last1 = NULL,
  last2 = NULL,
  last3 = NULL,
  status = 'active'
WHERE round_id = 1;

-- Check the reset
SELECT 'Game State After Reset:' as debug;
SELECT * FROM rounds_cache WHERE round_id = 1;
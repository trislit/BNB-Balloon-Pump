-- Reset the game state to start fresh
UPDATE rounds_cache SET
  pressure = '0',
  pot = '0',
  last1 = NULL,
  last2 = NULL,
  last3 = NULL,
  status = 'active',
  updated_at = NOW()
WHERE round_id = 1;

-- Verify the reset
SELECT * FROM rounds_cache WHERE round_id = 1;

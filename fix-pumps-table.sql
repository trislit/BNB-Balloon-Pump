-- Fix the pumps table by adding missing columns

-- Add session_id column
ALTER TABLE pumps ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Verify the column was added by checking the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'pumps' 
ORDER BY ordinal_position;

-- Test insert to verify it works
INSERT INTO pumps (
  user_id, 
  session_id, 
  round_id, 
  token, 
  spend, 
  status, 
  requested_at
) VALUES (
  '0x1234567890123456789012345678901234567890',
  'test-session',
  1,
  'TEST-TOKEN',
  '100',
  'queued',
  NOW()
) RETURNING *;

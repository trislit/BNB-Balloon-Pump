-- Add the missing session_id column to the pumps table

ALTER TABLE pumps ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Verify the column was added
SELECT 'session_id column added successfully!' as message;

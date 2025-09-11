-- Add Missing Leaderboard Columns
-- This adds the missing columns to the existing leaderboard table

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow all operations on leaderboard" ON public.leaderboard;
DROP POLICY IF EXISTS "Allow all operations on historical_rounds" ON public.historical_rounds;
DROP POLICY IF EXISTS "Allow all operations on user_stats" ON public.user_stats;

-- Add missing columns to existing leaderboard table if they don't exist
DO $$ 
BEGIN
    -- Add total_winnings column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leaderboard' AND column_name = 'total_winnings') THEN
        ALTER TABLE leaderboard ADD COLUMN total_winnings TEXT DEFAULT '0';
        RAISE NOTICE 'Added total_winnings column';
    END IF;
    
    -- Add net_winnings column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leaderboard' AND column_name = 'net_winnings') THEN
        ALTER TABLE leaderboard ADD COLUMN net_winnings TEXT DEFAULT '0';
        RAISE NOTICE 'Added net_winnings column';
    END IF;
    
    -- Add total_deposited column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leaderboard' AND column_name = 'total_deposited') THEN
        ALTER TABLE leaderboard ADD COLUMN total_deposited TEXT DEFAULT '0';
        RAISE NOTICE 'Added total_deposited column';
    END IF;
    
    -- Add pops_triggered column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leaderboard' AND column_name = 'pops_triggered') THEN
        ALTER TABLE leaderboard ADD COLUMN pops_triggered INTEGER DEFAULT 0;
        RAISE NOTICE 'Added pops_triggered column';
    END IF;
    
    -- Add last_pump_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leaderboard' AND column_name = 'last_pump_at') THEN
        ALTER TABLE leaderboard ADD COLUMN last_pump_at TIMESTAMPTZ;
        RAISE NOTICE 'Added last_pump_at column';
    END IF;
    
    -- Add nickname column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leaderboard' AND column_name = 'nickname') THEN
        ALTER TABLE leaderboard ADD COLUMN nickname TEXT;
        RAISE NOTICE 'Added nickname column';
    END IF;
    
    RAISE NOTICE 'Leaderboard columns check complete!';
END $$;

-- Recreate policies
CREATE POLICY "Allow all operations on leaderboard" ON public.leaderboard FOR ALL USING (true);
CREATE POLICY "Allow all operations on historical_rounds" ON public.historical_rounds FOR ALL USING (true);
CREATE POLICY "Allow all operations on user_stats" ON public.user_stats FOR ALL USING (true);

-- Check the current leaderboard table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'leaderboard' 
ORDER BY ordinal_position;

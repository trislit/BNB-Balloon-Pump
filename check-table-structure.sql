-- Check the actual structure of the rounds_cache table

-- 1. Check table structure
SELECT 'Table Structure:' as debug;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'rounds_cache' 
ORDER BY ordinal_position;

-- 2. Check current data
SELECT 'Current Data:' as debug;
SELECT * FROM rounds_cache;

-- 3. Check if we can insert without created_at/updated_at
SELECT 'Insert Test (without timestamps):' as debug;
INSERT INTO rounds_cache (round_id, status, pressure, pot, last1, last2, last3)
VALUES (999, 'active', '10', '5', '0xtest', NULL, NULL)
ON CONFLICT (round_id) DO NOTHING;

-- 4. Check if insert worked
SELECT 'After Insert:' as debug;
SELECT * FROM rounds_cache WHERE round_id = 999;

-- 5. Try to update the record
SELECT 'Update Test:' as debug;
UPDATE rounds_cache 
SET pressure = '20', pot = '10'
WHERE round_id = 999;

-- 6. Check if update worked
SELECT 'After Update:' as debug;
SELECT * FROM rounds_cache WHERE round_id = 999;

-- 7. Clean up test record
DELETE FROM rounds_cache WHERE round_id = 999;

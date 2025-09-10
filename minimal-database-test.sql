-- Minimal test to check database structure and basic operations

-- 1. Check if rounds_cache table exists and its structure
SELECT 'Table Structure:' as test;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'rounds_cache' 
ORDER BY ordinal_position;

-- 2. Check current data in rounds_cache
SELECT 'Current Data:' as test;
SELECT * FROM rounds_cache;

-- 3. Try to insert a test record
SELECT 'Insert Test:' as test;
INSERT INTO rounds_cache (round_id, status, pressure, pot, last1, last2, last3, created_at, updated_at)
VALUES (999, 'active', '10', '5', '0xtest', NULL, NULL, NOW(), NOW())
ON CONFLICT (round_id) DO NOTHING;

-- 4. Check if insert worked
SELECT 'After Insert:' as test;
SELECT * FROM rounds_cache WHERE round_id = 999;

-- 5. Try to update the record
SELECT 'Update Test:' as test;
UPDATE rounds_cache 
SET pressure = '20', pot = '10', updated_at = NOW()
WHERE round_id = 999;

-- 6. Check if update worked
SELECT 'After Update:' as test;
SELECT * FROM rounds_cache WHERE round_id = 999;

-- 7. Clean up test record
DELETE FROM rounds_cache WHERE round_id = 999;

-- =================================================
-- DATABASE CHECK SCRIPT
-- Run this in Supabase SQL Editor
-- =================================================

-- List all tables in public schema
SELECT
  tablename as table_name,
  tableowner as owner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check our specific tables
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN '✅ profiles table exists'
    ELSE '❌ profiles table missing'
  END as profiles_check,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pumps') THEN '✅ pumps table exists'
    ELSE '❌ pumps table missing'
  END as pumps_check,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rounds_cache') THEN '✅ rounds_cache table exists'
    ELSE '❌ rounds_cache table missing'
  END as rounds_cache_check,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deposits') THEN '✅ deposits table exists'
    ELSE '❌ deposits table missing'
  END as deposits_check;

-- Check initial data
SELECT 'Initial round data:' as info;
SELECT * FROM rounds_cache WHERE round_id = 1;

-- Count records in each table
SELECT
  'profiles' as table_name,
  COUNT(*) as record_count
FROM profiles
UNION ALL
SELECT
  'pumps' as table_name,
  COUNT(*) as record_count
FROM pumps
UNION ALL
SELECT
  'rounds_cache' as table_name,
  COUNT(*) as record_count
FROM rounds_cache
UNION ALL
SELECT
  'deposits' as table_name,
  COUNT(*) as record_count
FROM deposits;

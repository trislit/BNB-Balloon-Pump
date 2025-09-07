-- =================================================
-- DATABASE VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor after setup
-- =================================================

-- Check if core tables exist
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'pumps', 'rounds_cache', 'deposits')
ORDER BY tablename;

-- Check table structures (using information_schema)
SELECT
  'profiles table structure' as table_info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

SELECT
  'pumps table structure' as table_info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'pumps'
ORDER BY ordinal_position;

SELECT
  'rounds_cache table structure' as table_info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'rounds_cache'
ORDER BY ordinal_position;

SELECT
  'deposits table structure' as table_info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'deposits'
ORDER BY ordinal_position;

-- Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'pumps', 'rounds_cache', 'deposits')
ORDER BY tablename;

-- Check initial data
SELECT * FROM public.rounds_cache WHERE round_id = 1;

-- Count records in each table
SELECT
  'profiles' as table_name,
  COUNT(*) as record_count
FROM public.profiles
UNION ALL
SELECT
  'pumps' as table_name,
  COUNT(*) as record_count
FROM public.pumps
UNION ALL
SELECT
  'rounds_cache' as table_name,
  COUNT(*) as record_count
FROM public.rounds_cache
UNION ALL
SELECT
  'deposits' as table_name,
  COUNT(*) as record_count
FROM public.deposits;

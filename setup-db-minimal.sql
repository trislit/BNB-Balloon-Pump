-- =================================================
-- MINIMAL DATABASE SCHEMA SETUP
-- Copy and run this in Supabase SQL Editor
-- =================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CORE TABLES (Required for game to work)
-- =============================================

-- User profiles for SIWE authentication
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evm_address TEXT UNIQUE NOT NULL,
  ens_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pump transaction requests (core game mechanic)
CREATE TABLE IF NOT EXISTS public.pumps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  round_id BIGINT DEFAULT 1,
  token TEXT NOT NULL DEFAULT 'BNB',
  spend TEXT NOT NULL,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'confirmed', 'failed')),
  relayed_tx TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game state cache for real-time updates
CREATE TABLE IF NOT EXISTS public.rounds_cache (
  round_id BIGINT PRIMARY KEY,
  status TEXT DEFAULT 'active',
  pressure TEXT DEFAULT '0',
  pot TEXT DEFAULT '0',
  last1 TEXT,
  last2 TEXT,
  last3 TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Confirmed on-chain deposits
CREATE TABLE IF NOT EXISTS public.deposits (
  tx TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL DEFAULT 'BNB',
  amount TEXT NOT NULL,
  round_id BIGINT,
  confirmed BOOLEAN DEFAULT false,
  block_number BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- BASIC SECURITY (RLS Policies)
-- =============================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- Simple permissive policies (for development)
CREATE POLICY "Allow all operations on profiles" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Allow all operations on pumps" ON public.pumps FOR ALL USING (true);
CREATE POLICY "Allow all operations on rounds_cache" ON public.rounds_cache FOR ALL USING (true);
CREATE POLICY "Allow all operations on deposits" ON public.deposits FOR ALL USING (true);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_pumps_user_id ON public.pumps(user_id);
CREATE INDEX IF NOT EXISTS idx_pumps_status ON public.pumps(status);
CREATE INDEX IF NOT EXISTS idx_rounds_cache_updated_at ON public.rounds_cache(updated_at);
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON public.deposits(user_id);

-- =============================================
-- TRIGGER FOR UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rounds_cache_updated_at BEFORE UPDATE ON public.rounds_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INSERT INITIAL ROUND DATA
-- =============================================

INSERT INTO public.rounds_cache (round_id, status, pressure, pot)
VALUES (1, 'active', '0', '0')
ON CONFLICT (round_id) DO NOTHING;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

-- Check if tables were created successfully
SELECT
  'profiles: ' || COUNT(*) as profiles_table
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'profiles'
UNION ALL
SELECT
  'pumps: ' || COUNT(*) as pumps_table
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'pumps'
UNION ALL
SELECT
  'rounds_cache: ' || COUNT(*) as rounds_cache_table
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'rounds_cache'
UNION ALL
SELECT
  'deposits: ' || COUNT(*) as deposits_table
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'deposits';

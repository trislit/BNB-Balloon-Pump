-- =================================================
-- SIMPLE DATABASE SCHEMA SETUP
-- Copy and run this in Supabase SQL Editor
-- =================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- BASIC TABLES (No RLS for now)
-- =============================================

-- User profiles for SIWE authentication
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evm_address TEXT UNIQUE NOT NULL,
  ens_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pump transaction requests (core game mechanic)
CREATE TABLE IF NOT EXISTS pumps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
CREATE TABLE IF NOT EXISTS rounds_cache (
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
CREATE TABLE IF NOT EXISTS deposits (
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
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_pumps_user_id ON pumps(user_id);
CREATE INDEX IF NOT EXISTS idx_pumps_status ON pumps(status);
CREATE INDEX IF NOT EXISTS idx_rounds_cache_updated_at ON rounds_cache(updated_at);
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);

-- =============================================
-- INITIAL DATA
-- =============================================

INSERT INTO rounds_cache (round_id, status, pressure, pot)
VALUES (1, 'active', '0', '0')
ON CONFLICT (round_id) DO NOTHING;

-- =============================================
-- SUCCESS CHECK
-- =============================================

SELECT 'Setup completed successfully!' as status;

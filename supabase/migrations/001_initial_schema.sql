-- ============================================================================
-- Kingdom Game — Supabase Database Migration 001
-- Copy-paste ready for Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PLAYERS TABLE
-- Core identity. One row per player. Forever.
-- ============================================================================
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Auth identifiers (at least one required)
  wallet_address VARCHAR(50) UNIQUE,  -- Solana pubkey (base58)
  email VARCHAR(255) UNIQUE,          -- Optional email login
  username VARCHAR(30) UNIQUE,        -- Display name

  -- Auth metadata
  auth_method VARCHAR(10) NOT NULL DEFAULT 'wallet',
    -- 'wallet' | 'email'
  linked_wallet VARCHAR(50),
    -- For email users who later link a wallet

  -- Player progression
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  gem_balance INTEGER NOT NULL DEFAULT 0,

  -- Tutorial tracking (bitfield — saves space vs separate table)
  -- Bit 0: step 1 done, Bit 1: step 2 done, etc.
  tutorial_flags INTEGER NOT NULL DEFAULT 0,
  tutorial_complete BOOLEAN NOT NULL DEFAULT false,

  -- Autominer (one-time purchase, permanent for the season)
  has_autominer BOOLEAN NOT NULL DEFAULT false,
  autominer_purchased_at TIMESTAMPTZ,

  -- Session tracking
  last_login TIMESTAMPTZ DEFAULT NOW(),
  last_save TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Server-authoritative resource counts (anti-cheat)
  wood INTEGER NOT NULL DEFAULT 100,
  stone INTEGER NOT NULL DEFAULT 100,
  iron INTEGER NOT NULL DEFAULT 100,
  food INTEGER NOT NULL DEFAULT 100,
  max_storage INTEGER NOT NULL DEFAULT 500,

  -- Builder tracking
  builders_total INTEGER NOT NULL DEFAULT 1,
  builders_busy INTEGER NOT NULL DEFAULT 0,

  -- Daily login streak
  login_streak INTEGER NOT NULL DEFAULT 0,
  last_streak_date DATE,

  -- Seasonal
  season INTEGER NOT NULL DEFAULT 1,
  season_data JSONB DEFAULT '{}'::jsonb,

  -- Multi-tab detection
  active_session_id UUID,

  -- Optimistic locking
  save_version BIGINT NOT NULL DEFAULT 0
);

-- Partial unique indexes for nullable unique columns
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_wallet
  ON players(wallet_address) WHERE wallet_address IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_email
  ON players(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_players_last_active
  ON players(last_active);

COMMENT ON TABLE players IS
  'Core player record. One row per player. Resources stored here
   to avoid joins on every load. Denormalized intentionally for
   free-tier performance.';

-- ============================================================================
-- BUILDINGS TABLE
-- Every building a player has placed
-- ============================================================================
CREATE TABLE IF NOT EXISTS buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- Building identity
  building_type VARCHAR(20) NOT NULL,
    -- 'farm','lumber_mill','quarry','iron_mine','house','barracks',
    -- 'town_hall','wall','tower','army_camp','laboratory','warehouse'
  level INTEGER NOT NULL DEFAULT 1,

  -- Grid position (stored as slot index split into x/y for clarity)
  grid_x INTEGER NOT NULL,
  grid_y INTEGER NOT NULL,

  -- Construction state
  status VARCHAR(12) NOT NULL DEFAULT 'idle',
    -- 'idle' | 'building' | 'upgrading'
  construction_start TIMESTAMPTZ,
  construction_end TIMESTAMPTZ,

  -- Production tracking (for resource buildings)
  last_collected_at TIMESTAMPTZ DEFAULT NOW(),
  production_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
    -- units per hour, set by game config based on type+level

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent two buildings on same tile for same player
  UNIQUE(player_id, grid_x, grid_y)
);

CREATE INDEX IF NOT EXISTS idx_buildings_player
  ON buildings(player_id);
CREATE INDEX IF NOT EXISTS idx_buildings_status
  ON buildings(player_id, status) WHERE status != 'idle';

COMMENT ON TABLE buildings IS
  'All placed buildings. ~10-30 rows per player.
   Production rate stored here for fast offline calculation.';

-- ============================================================================
-- TRANSACTIONS TABLE
-- Gem purchases, SOL payments, gem spending
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  type VARCHAR(15) NOT NULL,
    -- 'gem_purchase' | 'gem_earned' | 'gem_spent' | 'autominer'

  gem_amount INTEGER NOT NULL, -- positive = gained, negative = spent
  source VARCHAR(30) NOT NULL,
    -- Purchase: 'store_handful','store_pouch','store_chest','store_autominer'
    -- Earned: 'tutorial','daily_login','milestone','achievement'
    -- Spent: 'speedup','builder_slot','autominer'
  description VARCHAR(100),

  -- SOL payment details (null if earned/spent)
  sol_amount DECIMAL(18,9),
  sol_tx_signature VARCHAR(128),
  usd_equivalent DECIMAL(10,4),

  -- Verification
  verified BOOLEAN DEFAULT false, -- true after on-chain confirmation

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_player
  ON transactions(player_id);
CREATE INDEX IF NOT EXISTS idx_tx_player_created
  ON transactions(player_id, created_at DESC);

COMMENT ON TABLE transactions IS
  'Financial audit trail. Every gem movement logged.
   Capped at ~100 per player via cleanup job.';

-- ============================================================================
-- AUTH NONCES TABLE
-- Single-use nonces for wallet signature verification
-- ============================================================================
CREATE TABLE IF NOT EXISTS auth_nonces (
  nonce UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 minutes')
);

CREATE INDEX IF NOT EXISTS idx_nonces_expires
  ON auth_nonces(expires_at);

COMMENT ON TABLE auth_nonces IS
  'Temporary nonces for wallet auth. Auto-expire after 5 min.
   Cleaned up by periodic job.';

-- ============================================================================
-- SAVE SNAPSHOTS TABLE (Emergency backups)
-- ============================================================================
CREATE TABLE IF NOT EXISTS save_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  trigger VARCHAR(20) NOT NULL,
    -- 'periodic' | 'logout' | 'purchase' | 'recovery'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_player
  ON save_snapshots(player_id, created_at DESC);

COMMENT ON TABLE save_snapshots IS
  'Emergency full-state backups. Max 3 per player.
   Used for recovery if incremental saves get corrupted.';

-- ============================================================================
-- ERRORS TABLE (Capped at 1000 rows)
-- ============================================================================
CREATE TABLE IF NOT EXISTS errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  error_type VARCHAR(50) NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  browser VARCHAR(120),
  game_state_hash VARCHAR(64),
  severity INTEGER NOT NULL DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_errors_created
  ON errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_errors_player
  ON errors(player_id) WHERE player_id IS NOT NULL;

COMMENT ON TABLE errors IS
  'Client-side error logs. Capped at 1000 rows via cleanup job.';

-- ============================================================================
-- ROW LEVEL SECURITY
-- Players can ONLY see/modify their own data
-- ============================================================================
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE save_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE errors ENABLE ROW LEVEL SECURITY;

-- Players: read/update own row only
CREATE POLICY players_select ON players FOR SELECT
  USING (id = auth.uid());
CREATE POLICY players_update ON players FOR UPDATE
  USING (id = auth.uid());

-- Buildings: full CRUD on own buildings
CREATE POLICY buildings_select ON buildings FOR SELECT
  USING (player_id = auth.uid());
CREATE POLICY buildings_insert ON buildings FOR INSERT
  WITH CHECK (player_id = auth.uid());
CREATE POLICY buildings_update ON buildings FOR UPDATE
  USING (player_id = auth.uid());
CREATE POLICY buildings_delete ON buildings FOR DELETE
  USING (player_id = auth.uid());

-- Transactions: read own, insert own (no update/delete ever)
CREATE POLICY tx_select ON transactions FOR SELECT
  USING (player_id = auth.uid());
CREATE POLICY tx_insert ON transactions FOR INSERT
  WITH CHECK (player_id = auth.uid());

-- Snapshots: read own only (insert via edge function with service role)
CREATE POLICY snapshots_select ON save_snapshots FOR SELECT
  USING (player_id = auth.uid());

-- Errors: insert only (no read via RLS — only service role reads)
CREATE POLICY errors_insert ON errors FOR INSERT
  WITH CHECK (player_id = auth.uid() OR player_id IS NULL);

-- ============================================================================
-- CLEANUP FUNCTION (Run as pg_cron or Edge Function daily)
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS void AS $$
BEGIN
  -- Delete expired nonces
  DELETE FROM auth_nonces WHERE expires_at < NOW();

  -- Keep only last 100 transactions per player
  DELETE FROM transactions WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY player_id ORDER BY created_at DESC
      ) AS rn FROM transactions
    ) ranked WHERE rn > 100
  );

  -- Keep only last 3 snapshots per player
  DELETE FROM save_snapshots WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY player_id ORDER BY created_at DESC
      ) AS rn FROM save_snapshots
    ) ranked WHERE rn > 3
  );

  -- Keep only last 1000 errors
  DELETE FROM errors WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn
      FROM errors
    ) ranked WHERE rn > 1000
  );

  -- Flag inactive players (no login for 90 days)
  UPDATE players SET season_data = season_data ||
    '{"inactive_flagged": true}'::jsonb
  WHERE last_active < NOW() - INTERVAL '90 days'
    AND NOT (season_data ? 'inactive_flagged');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_data IS
  'Run daily. Keeps database within free tier 500MB limit.';

-- ============================================================================
-- STORAGE USAGE MONITORING QUERY (Run manually to check space)
-- SELECT pg_size_pretty(pg_database_size(current_database()));
-- SELECT pg_size_pretty(pg_total_relation_size('players'));
-- SELECT COUNT(*) FROM players;
-- Alert threshold: archive inactive players when > 400MB
-- ============================================================================

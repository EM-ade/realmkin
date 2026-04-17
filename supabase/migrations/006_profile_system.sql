-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 006: Profile System
-- Adds power level, titles, avatar, and activity tracking to players table
-- ──────────────────────────────────────────────────────────────────────────────

-- Power level and profile additions
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS power_level INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unlocked_titles JSONB DEFAULT '["realm_born"]'::jsonb,
  ADD COLUMN IF NOT EXISTS active_title VARCHAR(50) DEFAULT 'realm_born',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total_buildings_built INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS days_active INTEGER DEFAULT 0;

-- Index for leaderboard/rank queries
CREATE INDEX IF NOT EXISTS idx_players_power_level
  ON players(power_level DESC);

-- Title change history log
CREATE TABLE IF NOT EXISTS title_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  title_id VARCHAR(50) NOT NULL,
  equipped_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_title_changes_player
  ON title_changes(player_id);

-- ── Backfill power level for existing players ────────────────────────────────
-- Note: This is a one-time migration. Power levels will be recalculated
-- server-side via edge functions going forward.
-- The actual backfill should be done via an Edge Function that iterates
-- through all players and calculates their power level using the formula.
-- Uncomment and run after deploying the recalculate-power-level edge function:

-- UPDATE players SET power_level = 0 WHERE power_level IS NULL;

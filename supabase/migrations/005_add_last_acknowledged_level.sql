-- ============================================================================
-- Kingdom Game — Supabase Database Migration 005
-- Adding last_acknowledged_level to players table
-- Fixes level-up modal re-triggering on every login
-- ============================================================================

-- Add column to track the last level the player has acknowledged seeing
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS last_acknowledged_level INTEGER NOT NULL DEFAULT 1;

-- Backfill: Set acknowledged level to current level for all existing players
-- (they've already seen all their level ups up to their current level)
UPDATE players 
SET last_acknowledged_level = level 
WHERE last_acknowledged_level = 1 AND level > 1;

-- Add index for faster lookups during level-up checks
CREATE INDEX IF NOT EXISTS idx_players_last_acknowledged_level 
ON players(last_acknowledged_level);

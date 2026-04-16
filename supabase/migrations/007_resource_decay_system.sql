-- ============================================================================
-- Kingdom Game — Resource Decay System Migration
-- Adds 15% resource decay per 24 hours for players without autominer
-- ============================================================================

-- Add last_online column to track when player truly went offline
-- (last_active is updated during gameplay, last_online is set on logout)
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_online TIMESTAMPTZ DEFAULT NOW();

-- Index for efficient decay queries
CREATE INDEX IF NOT EXISTS idx_players_last_online ON players(last_online);

COMMENT ON COLUMN players.last_online IS
'Timestamp when player went offline. Used for resource decay calculation.
Updated via /api/game/save-state when player logs out or closes game.';
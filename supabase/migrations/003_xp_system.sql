-- ============================================================================
-- Kingdom Game — Supabase Database Migration 003
-- Adding XP System Tables
-- ============================================================================

-- Log of every XP-rewarding action to enforce daily caps & cooldowns
CREATE TABLE IF NOT EXISTS player_xp_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  action_id VARCHAR(50) NOT NULL,
  xp_amount INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compound index to quickly count actions per day or check recent cooldowns
CREATE INDEX IF NOT EXISTS idx_xp_log_player_action
  ON player_xp_log(player_id, action_id, created_at DESC);

-- Track which one-time milestones the player has achieved (e.g. first building limits)
CREATE TABLE IF NOT EXISTS player_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  milestone_id VARCHAR(50) NOT NULL,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, milestone_id)
);

-- RLS Setup
ALTER TABLE player_xp_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_milestones ENABLE ROW LEVEL SECURITY;

-- Players can read their own logs and milestones
CREATE POLICY xp_log_select ON player_xp_log FOR SELECT USING (player_id = auth.uid());
CREATE POLICY milestones_select ON player_milestones FOR SELECT USING (player_id = auth.uid());

-- Inserts are ONLY done via the secure edge function (process-xp) running with service role.
-- No INSERT policies for anonymous or authenticated roles.

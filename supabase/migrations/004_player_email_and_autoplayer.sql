-- Migration 004: Player Email Systems & AutoPlayer (Autominer)
-- Adds support for recovery emails and automated/offline resource collection.

-- 1. Updates to players table
ALTER TABLE players
ADD COLUMN IF NOT EXISTS has_autominer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_set_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS autoplayer_total_collected JSONB 
    DEFAULT '{"wood":0,"stone":0,"iron":0,"food":0}'::jsonb;

-- 2. Email change audit log
CREATE TABLE IF NOT EXISTS email_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  -- Store hashed emails for privacy in audit logs
  old_email_hash VARCHAR(64),
  new_email_hash VARCHAR(64),
  gems_spent INTEGER NOT NULL DEFAULT 50,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE email_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their own email change logs"
ON email_change_log FOR SELECT
TO authenticated
USING (auth.uid() = player_id);

-- 3. Auto player session stats
CREATE TABLE IF NOT EXISTS autoplayer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  session_start TIMESTAMPTZ DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  total_wood_collected INTEGER DEFAULT 0,
  total_stone_collected INTEGER DEFAULT 0,
  total_iron_collected INTEGER DEFAULT 0,
  total_food_collected INTEGER DEFAULT 0,
  collection_count INTEGER DEFAULT 0
);

-- Enable RLS on session stats
ALTER TABLE autoplayer_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their own autoplayer sessions"
ON autoplayer_sessions FOR SELECT
TO authenticated
USING (auth.uid() = player_id);

-- 4. Notify about changes
COMMENT ON COLUMN players.has_autominer IS 'Flag for the premium Autominer feature.';
COMMENT ON TABLE email_change_log IS 'Audit log for premium email changes.';
COMMENT ON TABLE autoplayer_sessions IS 'Tracks online/offline collection performance for the Autominer.';

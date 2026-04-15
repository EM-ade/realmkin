-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 001: Add Gems to Player Function
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Atomic gem addition — prevents race conditions if called twice
CREATE OR REPLACE FUNCTION add_gems_to_player(
  p_player_id UUID,
  p_gems INTEGER
)
RETURNS void AS $$
BEGIN
  UPDATE players
  SET gem_balance = gem_balance + p_gems,
      updated_at = NOW()
  WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- Ensure transactions table has sol_tx_signature column
-- ─────────────────────────────────────────────────────────────────────────────
-- If the column doesn't exist yet, add it:
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS sol_tx_signature TEXT,
  ADD COLUMN IF NOT EXISTS sol_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS usd_equivalent NUMERIC,
  ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;

-- Add index for replay prevention lookups
CREATE INDEX IF NOT EXISTS idx_transactions_sol_tx_signature
  ON transactions (sol_tx_signature);

-- ─────────────────────────────────────────────────────────────────────────────
-- Ensure players table has required columns for wallet auth
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS wallet_address TEXT,
  ADD COLUMN IF NOT EXISTS auth_method TEXT DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS has_autominer BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS autominer_purchased_at TIMESTAMPTZ;

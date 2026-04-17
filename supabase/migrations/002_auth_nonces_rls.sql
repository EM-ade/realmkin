-- ============================================================================
-- Migration 002: Fix auth_nonces RLS policies
-- The wallet auth flow requires unauthenticated users to insert their own nonce.
-- Without these policies the insert fails silently, causing 401 on verify-wallet.
-- ============================================================================

-- Allow anyone (including anon) to insert a nonce
DROP POLICY IF EXISTS auth_nonces_insert ON auth_nonces;
CREATE POLICY auth_nonces_insert ON auth_nonces
  FOR INSERT WITH CHECK (true);

-- Allow anyone to read nonces (edge function uses service role anyway,
-- but this keeps the client-side flow working too)
DROP POLICY IF EXISTS auth_nonces_select ON auth_nonces;
CREATE POLICY auth_nonces_select ON auth_nonces
  FOR SELECT USING (true);

-- Allow anyone to delete nonces (used nonces removed after verification)
DROP POLICY IF EXISTS auth_nonces_delete ON auth_nonces;
CREATE POLICY auth_nonces_delete ON auth_nonces
  FOR DELETE USING (true);

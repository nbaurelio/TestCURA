-- ═══════════════════════════════════════════════════════════════════════════
-- ADD STATUS COLUMN TO PROFILES
-- ═══════════════════════════════════════════════════════════════════════════
-- Stores the account state so users can deactivate their own account from
-- the Edit Profile dialog and the System Admin can lock / reactivate accounts
-- from the Users Management table. Values:
--   ACTIVE    — normal login allowed (default)
--   INACTIVE  — user-initiated deactivation; login rejected
--   LOCKED    — admin-imposed lockout; login rejected

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE'
  CHECK (status IN ('ACTIVE', 'INACTIVE', 'LOCKED'));

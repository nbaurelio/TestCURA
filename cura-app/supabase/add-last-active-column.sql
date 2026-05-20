-- ═══════════════════════════════════════════════════════════════════════════
-- ADD LAST_ACTIVE_AT COLUMN TO PROFILES
-- ═══════════════════════════════════════════════════════════════════════════
-- Tracks the timestamp of the user's most recent successful login. Used by
-- the System Admin users page to auto-flip accounts to INACTIVE after one
-- year of no activity. Defaults to NOW() on insert so newly-created accounts
-- start with a fresh activity timestamp.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill legacy rows that pre-date this column: seed `last_active_at`
-- from `created_at` so old accounts don't immediately appear inactive.
UPDATE profiles
SET last_active_at = created_at
WHERE last_active_at IS NULL;

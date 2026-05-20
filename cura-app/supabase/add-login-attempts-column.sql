-- ═══════════════════════════════════════════════════════════════════════════
-- ADD FAILED LOGIN ATTEMPTS COUNTER
-- ═══════════════════════════════════════════════════════════════════════════
-- Drives the automatic lockout rule: 5 consecutive wrong-password attempts
-- flips `status` to 'LOCKED'. The counter resets to 0 on a successful login
-- or when a System Admin reactivates the account.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;

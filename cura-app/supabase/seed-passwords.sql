-- ═══════════════════════════════════════════════════════════════════════════
-- SEED PASSWORDS FOR ALL EXISTING ACCOUNTS
-- ═══════════════════════════════════════════════════════════════════════════
-- One-shot helper for the test/mock environment: assigns the default password
-- "password" to every profile that doesn't already have one set, AND
-- overwrites any existing values so every account ends up with the same known
-- credential. Use this after seeding fresh data when you want predictable
-- logins across the whole user base.
--
-- ⚠️  PRODUCTION NOTE
-- Plaintext passwords are acceptable ONLY in this mock setup. Never run this
-- against a real environment — migrate to Supabase Auth or hash credentials
-- with bcrypt/argon2 before going live.
-- ═══════════════════════════════════════════════════════════════════════════

-- Make sure the column exists (no-op if add-password-column.sql already ran).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS password TEXT;

-- Assign the default password to every account.
UPDATE profiles
SET password = 'password';

-- Sanity check: list the resulting credentials so you can copy a few for
-- testing. Comment out if you don't want the dump.
SELECT email, role, password
FROM profiles
ORDER BY role, last_name, first_name;

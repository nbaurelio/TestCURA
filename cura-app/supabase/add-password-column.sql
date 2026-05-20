-- ═══════════════════════════════════════════════════════════════════════════
-- ADD PASSWORD COLUMN TO PROFILES
-- ═══════════════════════════════════════════════════════════════════════════
-- The mock auth used by the CURA test environment does not rely on Supabase
-- Auth. To let the System Admin set real per-user credentials from the
-- "Edit Profile" dialog, we add a `password` column directly on the profiles
-- table.
--
-- ⚠️  PRODUCTION NOTE
-- Storing plaintext passwords is acceptable ONLY for this test/mock setup.
-- Before going to production, migrate to Supabase Auth (auth.users) or hash
-- with bcrypt/argon2 — never persist plaintext credentials in a real system.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS password TEXT;

-- Optional: seed a default password for legacy test accounts so they keep
-- working with the new email/password login flow. Remove or change as needed.
UPDATE profiles SET password = 'password' WHERE password IS NULL;

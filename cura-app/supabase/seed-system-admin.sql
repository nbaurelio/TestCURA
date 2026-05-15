-- ═══════════════════════════════════════════════════════════════════════════
-- SYSTEM ADMINISTRATOR SEED
-- ═══════════════════════════════════════════════════════════════════════════
-- Creates the test account used by the System Admin dashboard.
--
-- After running this, login at /login with:
--   Email:    sysadmin@example.com
--   Password: anything (the mock auth ignores password)
-- and you'll be redirected to /system-admin.

INSERT INTO profiles (id, email, first_name, last_name, year_level, clinical_department, role)
VALUES (
  'dddd0000-0000-0000-0000-000000000000',
  'sysadmin@example.com',
  'System',
  'Administrator',
  NULL,
  NULL,
  'system_admin'
)
ON CONFLICT (id) DO UPDATE SET role = 'system_admin';

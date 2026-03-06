-- TEMPORARY: Disable RLS for testing only
-- WARNING: This removes security - only use for development/testing

ALTER TABLE referrals DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

-- Also need to modify the insert to not require user_id
-- Or we can create a mock user_id for testing

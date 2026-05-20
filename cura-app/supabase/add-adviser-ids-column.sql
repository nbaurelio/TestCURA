-- Add adviser_ids column to profiles table for multiple adviser assignment
-- This replaces the single adviser_id field with an array of professor IDs

-- Add the adviser_ids column as a text array (stores UUIDs of professors)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adviser_ids TEXT[] DEFAULT NULL;

-- Migrate data from old adviser_id column if it exists (convert single ID to array)
DO $$
BEGIN
  -- Check if the old adviser_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'adviser_id'
  ) THEN
    -- Migrate existing data: convert single adviser_id to array
    UPDATE profiles
    SET adviser_ids = ARRAY[adviser_id::text]
    WHERE adviser_id IS NOT NULL AND adviser_ids IS NULL;

    -- Drop the old column
    ALTER TABLE profiles DROP COLUMN adviser_id;
  END IF;
END $$;

-- Add comment explaining the column
COMMENT ON COLUMN profiles.adviser_ids IS 'Array of professor profile IDs who are advisers for this clinician';

-- Note: To query profiles where a specific professor is an adviser:
-- SELECT * FROM profiles WHERE adviser_ids @> '{professor-uuid}';
-- Or in Supabase JS: .contains('adviser_ids', ['professor-uuid'])

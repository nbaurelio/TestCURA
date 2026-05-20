-- Add missing columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#1e3a5f';
ALTER TABLE events ADD COLUMN IF NOT EXISTS medical_alert TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';
ALTER TABLE events ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Backfill existing referral-created events (identified by title pattern)
UPDATE events SET source = 'referral' WHERE title LIKE 'Referral Appointment%' AND source IS NULL;

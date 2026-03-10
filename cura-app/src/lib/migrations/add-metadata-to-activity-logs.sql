-- Add metadata column to activity_logs table
ALTER TABLE activity_logs 
ADD COLUMN IF NOT EXISTS metadata TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_metadata ON activity_logs(metadata);

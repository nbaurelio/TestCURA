-- Event status history table — tracks each status change for an event
CREATE TABLE IF NOT EXISTS event_status_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID NOT NULL,
  status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_status_history_event_id ON event_status_history(event_id);

ALTER TABLE event_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all event status history" ON event_status_history
  FOR SELECT USING (true);

CREATE POLICY "Users can insert event status history" ON event_status_history
  FOR INSERT WITH CHECK (true);

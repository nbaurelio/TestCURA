-- Professor-specific overrides for advisee events (color, is_favorite)
CREATE TABLE IF NOT EXISTS event_overrides (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  professor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_id UUID NOT NULL,
  color TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(professor_id, event_id)
);

-- Allow professors to manage their own overrides
ALTER TABLE event_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professors can manage own overrides" ON event_overrides
  FOR ALL USING (auth.uid() = professor_id);

-- Planner data per user
CREATE TABLE IF NOT EXISTS planner_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tasks JSONB DEFAULT '[]',
  schedule JSONB DEFAULT '[]',
  categories JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS: users can only access their own data
ALTER TABLE planner_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own planner_data"
  ON planner_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own planner_data"
  ON planner_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own planner_data"
  ON planner_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own planner_data"
  ON planner_data FOR DELETE
  USING (auth.uid() = user_id);

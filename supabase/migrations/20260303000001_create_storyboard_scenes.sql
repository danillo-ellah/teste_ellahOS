-- Storyboard scenes para planejamento visual de producao
CREATE TABLE IF NOT EXISTS storyboard_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  scene_number int NOT NULL,
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  shot_type text DEFAULT '',
  location text DEFAULT '',
  cast_notes text DEFAULT '',
  camera_notes text DEFAULT '',
  mood_references jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','em_preparo','filmada','aprovada')),
  sort_order int NOT NULL DEFAULT 0,
  shooting_date_id uuid REFERENCES job_shooting_dates(id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE storyboard_scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY storyboard_scenes_tenant_isolation ON storyboard_scenes
  FOR ALL USING (tenant_id = ((current_setting('request.jwt.claims', true)::jsonb)->>'tenant_id')::uuid);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_storyboard_scenes_job ON storyboard_scenes(job_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_storyboard_scenes_tenant ON storyboard_scenes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_storyboard_scenes_shooting_date ON storyboard_scenes(shooting_date_id);

-- Trigger updated_at (usa a funcao update_updated_at() ja existente no banco)
CREATE OR REPLACE TRIGGER set_storyboard_scenes_updated_at
  BEFORE UPDATE ON storyboard_scenes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

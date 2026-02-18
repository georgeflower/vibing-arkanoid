
-- Create telemetry table
CREATE TABLE public.game_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  snapshot_type text NOT NULL DEFAULT 'periodic',
  level integer,
  difficulty text,
  game_mode text,
  avg_fps real,
  min_fps real,
  quality_level text,
  ball_count integer,
  brick_count integer,
  enemy_count integer,
  particle_count integer,
  explosion_count integer,
  ccd_total_ms real,
  ccd_substeps integer,
  ccd_collisions integer,
  toi_iterations integer,
  wall_collisions integer,
  brick_collisions integer,
  paddle_collisions integer,
  boss_collisions integer,
  boss_active boolean DEFAULT false,
  boss_type text,
  duration_seconds real,
  final_score integer,
  total_quality_changes integer,
  user_agent text
);

-- Enable RLS
ALTER TABLE public.game_telemetry ENABLE ROW LEVEL SECURITY;

-- Everyone can read (for Cloud View queries)
CREATE POLICY "Telemetry is viewable by everyone"
ON public.game_telemetry FOR SELECT USING (true);

-- Only service_role can insert (via edge function)
CREATE POLICY "Only backend can insert telemetry"
ON public.game_telemetry FOR INSERT WITH CHECK (true);

-- Index for session queries
CREATE INDEX idx_telemetry_session ON public.game_telemetry (session_id);
CREATE INDEX idx_telemetry_created ON public.game_telemetry (created_at);

-- Add boss_level column to track which boss the player reached
ALTER TABLE public.boss_rush_scores 
ADD COLUMN boss_level INTEGER NOT NULL DEFAULT 5;

-- Create index for efficient queries
CREATE INDEX idx_boss_rush_scores_level ON public.boss_rush_scores (boss_level DESC);